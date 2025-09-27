from flask import Blueprint, request, jsonify
from app.db import get_db_connection
from app.services.notifications import (
    notify_submit, notify_approved, notify_rejected, notify_retrieved, notify_return_recorded
)
import logging  # NEW

borrowreturn_bp = Blueprint('borrowreturn', __name__)

logger = logging.getLogger(__name__)  # NEW

# Helpers
def _classify_route_by_items(cursor, borrow_id):
    cursor.execute("SELECT ItemType FROM BorrowedItems WHERE BorrowID=%s", (borrow_id,))
    rows = cursor.fetchall() or []
    return 'admin' if any(r.get('ItemType') == 'Document' for r in rows) else 'librarian'

def _norm_book_copy_id(it):
    return it.get('bookCopyId') or it.get('copyId') or it.get('Copy_ID')

def _norm_doc_storage_id(it):
    return it.get('documentStorageId') or it.get('storageId') or it.get('Storage_ID')

def _norm_document_id(it):
    return it.get('documentId') or it.get('DocumentID') or it.get('Document_ID') or it.get('document_id')

def _insert_borrow_items(cursor, borrow_id, items):
    if not items:
        return []
    params = []
    for it in items:
        item_type = it.get('itemType')
        book_copy_id = _norm_book_copy_id(it) if item_type == 'Book' else None
        document_id  = _norm_document_id(it)  if item_type == 'Document' else None
        doc_storage_id = _norm_doc_storage_id(it) if item_type == 'Document' else None

        if item_type == 'Book' and not book_copy_id:
            raise ValueError('Missing bookCopyId for a Book item.')

        if item_type == 'Document':
            # Always require the logical Document_ID
            if not document_id:
                raise ValueError('Missing documentId for a Document item.')
            # Physical documents must also have a storage (copy) id; digital items may omit it
            # Digital is implied by doc_storage_id is None
            # No DocType column is used anymore.

        params.append((
            borrow_id,
            item_type,
            book_copy_id,
            document_id,
            doc_storage_id,
            it.get('initialCondition', '')
        ))

    # Insert without DocType; include DocumentID
    cursor.executemany("""
        INSERT INTO BorrowedItems (BorrowID, ItemType, BookCopyID, Document_ID, DocumentStorageID, InitialCondition)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, params)

    cursor.execute("SELECT * FROM BorrowedItems WHERE BorrowID=%s", (borrow_id,))
    return cursor.fetchall() or []


# --- Add a new borrow transaction (split routes: librarian=Books, admin=Documents) ---
@borrowreturn_bp.route('/borrow', methods=['POST'])
def add_borrow_transaction():
    data = request.json or {}
    items = data.get('items') or []
    if not items:
        logger.warning("Borrow creation attempted with no items. payload=%s", data)  # NEW
        return jsonify({'error': 'No items provided.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        book_items = [it for it in items if it.get('itemType') == 'Book']
        doc_items  = [it for it in items if it.get('itemType') == 'Document']

        def create_tx(item_list, approval_status, update_availability):
            cursor.execute("""
                INSERT INTO BorrowTransactions (BorrowerID, Purpose, ApprovalStatus, ApprovedByStaffID, RetrievalStatus, ReturnStatus, BorrowDate)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                data['borrowerId'],
                data.get('purpose', ''),
                approval_status,
                data.get('approvedByStaffId'),
                data.get('retrievalStatus', 'Pending'),
                data.get('returnStatus', 'Not Returned'),
                data.get('borrowDate')
            ))
            borrow_id = cursor.lastrowid

            inserted_items = _insert_borrow_items(cursor, borrow_id, item_list)

            # Books: hold immediately; documents are held at approval only if physical
            if update_availability and item_list:
                book_copy_ids = [_norm_book_copy_id(it) for it in item_list
                                 if it.get('itemType') == 'Book' and _norm_book_copy_id(it)]
                if book_copy_ids:
                    fmt = ','.join(['%s'] * len(book_copy_ids))
                    cursor.execute(f"UPDATE Book_Inventory SET Availability='Borrowed' WHERE Copy_ID IN ({fmt})", tuple(book_copy_ids))

            if data.get('returnDate'):
                cursor.execute("""
                    INSERT INTO ReturnTransactions (BorrowID, ReturnDate)
                    VALUES (%s, %s)
                """, (borrow_id, data['returnDate']))

            cursor.execute("SELECT * FROM BorrowTransactions WHERE BorrowID=%s", (borrow_id,))
            tx = cursor.fetchone()
            return {'transaction': tx, 'items': inserted_items}

        results = []
        if book_items and doc_items:
            results.append({**create_tx(book_items, 'Pending', True),  'route': 'librarian'})
            results.append({**create_tx(doc_items,  'Pending', False), 'route': 'admin'})
        elif book_items:
            results.append({**create_tx(book_items, 'Pending', True),  'route': 'librarian'})
        else:
            results.append({**create_tx(doc_items,  'Pending', False), 'route': 'admin'})

        # Create notifications for each newly created transaction
        for res in results:
            borrow_id = res['transaction']['BorrowID']
            notify_submit(cursor, borrow_id, res['route'])

        conn.commit()
        if len(results) == 1:
            return jsonify(results[0]), 201
        else:
            return jsonify({'message': 'Split into librarian (books) and admin (documents) transactions.', 'transactions': results}), 201

    except ValueError as e:
        conn.rollback()
        # NEW: log validation errors with payload
        logger.warning("Borrow creation failed (ValueError): %s | payload=%s", e, data, exc_info=True)
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        conn.rollback()
        # NEW: log unexpected errors with stack trace and payload
        logger.exception("Borrow creation failed (Unexpected). payload=%s", data)
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# --- List all borrow transactions and their items (role filter: ?role=librarian|admin) ---
@borrowreturn_bp.route('/borrow', methods=['GET'])
def list_borrow_transactions():
    role = (request.args.get('role') or '').lower()

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM BorrowTransactions")
        transactions = cursor.fetchall() or []

        borrow_ids = [tx['BorrowID'] for tx in transactions]
        items_by_borrow = {}
        returns_by_borrow = {}

        if borrow_ids:
            fmt = ','.join(['%s'] * len(borrow_ids))
            cursor.execute(f"SELECT * FROM BorrowedItems WHERE BorrowID IN ({fmt})", tuple(borrow_ids))
            for item in cursor.fetchall() or []:
                items_by_borrow.setdefault(item['BorrowID'], []).append(item)

            cursor.execute(f"""
                SELECT BorrowID, MAX(ReturnDate) AS ReturnDate
                FROM ReturnTransactions
                WHERE BorrowID IN ({fmt})
                GROUP BY BorrowID
            """, tuple(borrow_ids))
            for ret in cursor.fetchall() or []:
                returns_by_borrow[ret['BorrowID']] = ret['ReturnDate']

        # Role filtering
        if role == 'librarian':
            transactions = [tx for tx in transactions
                            if not any((it.get('ItemType') == 'Document') for it in items_by_borrow.get(tx['BorrowID'], []))]
        elif role == 'admin':
            transactions = [tx for tx in transactions
                            if any((it.get('ItemType') == 'Document') for it in items_by_borrow.get(tx['BorrowID'], []))]

        for tx in transactions:
            tx['items'] = items_by_borrow.get(tx['BorrowID'], [])
            tx['ReturnDate'] = returns_by_borrow.get(tx['BorrowID'])

        return jsonify(transactions), 200
    finally:
        cursor.close()
        conn.close()


# --- Get all borrow transactions for a specific borrower ---
@borrowreturn_bp.route('/borrow/borrower/<int:borrower_id>', methods=['GET'])
def get_borrower_transactions(borrower_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM BorrowTransactions WHERE BorrowerID=%s", (borrower_id,))
        transactions = cursor.fetchall() or []

        borrow_ids = [tx['BorrowID'] for tx in transactions]
        items_by_borrow = {}
        returns_by_borrow = {}

        if borrow_ids:
            fmt = ','.join(['%s'] * len(borrow_ids))
            cursor.execute(f"SELECT * FROM BorrowedItems WHERE BorrowID IN ({fmt})", tuple(borrow_ids))
            for item in cursor.fetchall() or []:
                items_by_borrow.setdefault(item['BorrowID'], []).append(item)

            cursor.execute(f"""
                SELECT BorrowID, MAX(ReturnDate) AS ReturnDate
                FROM ReturnTransactions
                WHERE BorrowID IN ({fmt})
                GROUP BY BorrowID
            """, tuple(borrow_ids))
            for ret in cursor.fetchall() or []:
                returns_by_borrow[ret['BorrowID']] = ret['ReturnDate']

        for tx in transactions:
            tx['items'] = items_by_borrow.get(tx['BorrowID'], [])
            tx['ReturnDate'] = returns_by_borrow.get(tx['BorrowID'])

        return jsonify(transactions), 200
    finally:
        cursor.close()
        conn.close()


# --- Approve a borrow transaction (role-guarded) ---
@borrowreturn_bp.route('/borrow/<int:borrow_id>/approve', methods=['PUT'])
def approve_borrow_transaction(borrow_id):
    role = (request.args.get('role') or 'librarian').lower()
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        route = _classify_route_by_items(cursor, borrow_id)
        if route != role:
            return jsonify({'error': f'Transaction not allowed via {role} route.', 'route': route}), 403

        cursor.execute("""
            UPDATE BorrowTransactions
            SET ApprovalStatus='Approved'
            WHERE BorrowID=%s
        """, (borrow_id,))

        if role == 'admin':
            # Fetch document items; physical if they have a storage_id, digital otherwise
            cursor.execute("""
                SELECT Document_ID, DocumentStorageID
                FROM BorrowedItems
                WHERE BorrowID=%s AND ItemType='Document'
            """, (borrow_id,))
            rows = cursor.fetchall() or []
            phys_ids = [r['DocumentStorageID'] for r in rows if r.get('DocumentStorageID')]
            has_digital = any(not r.get('DocumentStorageID') for r in rows)

            # Only physical docs affect inventory
            if phys_ids:
                fmt = ','.join(['%s'] * len(phys_ids))
                cursor.execute(f"""
                    UPDATE Document_Inventory
                    SET Availability='Borrowed'
                    WHERE Storage_ID IN ({fmt})
                """, tuple(phys_ids))

            # Digital docs: set expiration (due) date from request body if provided
            if has_digital:
                body = request.get_json(silent=True) or {}
                due_date = body.get('returnDate') or body.get('dueDate')
                if due_date:
                    cursor.execute("""
                        INSERT INTO ReturnTransactions (BorrowID, ReturnDate)
                        VALUES (%s, %s)
                    """, (borrow_id, due_date))

        notify_approved(cursor, borrow_id)
        conn.commit()
        return jsonify({'message': 'Borrow transaction approved.'}), 200
    finally:
        cursor.close()
        conn.close()


# --- Reject a borrow transaction (role-guarded, frees availability) ---
@borrowreturn_bp.route('/borrow/<int:borrow_id>/reject', methods=['PUT'])
def reject_borrow_transaction(borrow_id):
    role = (request.args.get('role') or 'librarian').lower()

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        route = _classify_route_by_items(cursor, borrow_id)
        if route != role:
            return jsonify({'error': f'Transaction not allowed via {role} route.', 'route': route}), 403

        cursor.execute("""
            UPDATE BorrowTransactions
            SET ApprovalStatus='Rejected'
            WHERE BorrowID=%s
        """, (borrow_id,))

        # Free books
        cursor.execute("""
            SELECT BookCopyID
            FROM BorrowedItems
            WHERE BorrowID=%s AND ItemType='Book' AND BookCopyID IS NOT NULL
        """, (borrow_id,))
        book_rows = cursor.fetchall() or []
        book_ids = [r['BookCopyID'] for r in book_rows if r.get('BookCopyID')]
        if book_ids:
            fmt = ','.join(['%s'] * len(book_ids))
            cursor.execute(f"UPDATE Book_Inventory SET Availability='Available' WHERE Copy_ID IN ({fmt})", tuple(book_ids))

        # Free only physical documents (those with a storage id)
        cursor.execute("""
            SELECT DocumentStorageID
            FROM BorrowedItems
            WHERE BorrowID=%s AND ItemType='Document' AND DocumentStorageID IS NOT NULL
        """, (borrow_id,))
        doc_rows = cursor.fetchall() or []
        storage_ids = [r['DocumentStorageID'] for r in doc_rows if r.get('DocumentStorageID')]
        if storage_ids:
            fmt = ','.join(['%s'] * len(storage_ids))
            cursor.execute(f"UPDATE Document_Inventory SET Availability='Available' WHERE Storage_ID IN ({fmt})", tuple(storage_ids))

        notify_rejected(cursor, borrow_id)
        conn.commit()
        return jsonify({'message': 'Borrow transaction rejected.'}), 200
    finally:
        cursor.close()
        conn.close()


# --- Set transaction as retrieved (role-guarded, status only) ---
@borrowreturn_bp.route('/borrow/<int:borrow_id>/retrieved', methods=['PUT'])
def set_borrow_transaction_retrieved(borrow_id):
    role = (request.args.get('role') or 'librarian').lower()

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        route = _classify_route_by_items(cursor, borrow_id)
        if route != role:
            return jsonify({'error': f'Transaction not allowed via {role} route.', 'route': route}), 403

        cursor.execute("""
            UPDATE BorrowTransactions
            SET RetrievalStatus='Retrieved'
            WHERE BorrowID=%s
        """, (borrow_id,))

        notify_retrieved(cursor, borrow_id, route)
        conn.commit()
        return jsonify({'message': 'Borrow transaction set as retrieved.'}), 200
    finally:
        cursor.close()
        conn.close()


# --- Add a return transaction (batched) ---
@borrowreturn_bp.route('/return', methods=['POST'])
def add_return_transaction():
    data = request.json or {}
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        cursor.execute("""
            INSERT INTO ReturnTransactions (BorrowID, ReturnDate, ReceivedByStaffID, Remarks)
            VALUES (%s, %s, %s, %s)
        """, (
            data['borrowId'],
            data['returnDate'],
            data.get('receivedByStaffId'),
            data.get('remarks', '')
        ))
        return_id = cursor.lastrowid

        items = data.get('items') or []
        if items:
            params = []
            borrowed_item_ids = []
            for it in items:
                params.append((return_id, it['borrowedItemId'], it.get('returnCondition', ''), it.get('fine', 0.00), it.get('finePaid', 'No')))
                borrowed_item_ids.append(it['borrowedItemId'])

            cursor.executemany("""
                INSERT INTO ReturnedItems (ReturnID, BorrowedItemID, ReturnCondition, Fine, FinePaid)
                VALUES (%s, %s, %s, %s, %s)
            """, params)

            # Map borrowed items; physical documents have a storage id
            fmt = ','.join(['%s'] * len(borrowed_item_ids))
            cursor.execute(f"""
                SELECT BorrowedItemID, ItemType, BookCopyID, Document_ID, DocumentStorageID
                FROM BorrowedItems
                WHERE BorrowedItemID IN ({fmt})
            """, tuple(borrowed_item_ids))
            rows = cursor.fetchall() or []
            cond_map = {it['borrowedItemId']: it.get('returnCondition', '') for it in items}

            book_updates = [(r['BookCopyID'], cond_map.get(r['BorrowedItemID'], '')) for r in rows if r['ItemType']=='Book' and r.get('BookCopyID')]
            doc_updates  = [(r['DocumentStorageID'], cond_map.get(r['BorrowedItemID'], ''))
                            for r in rows if r['ItemType']=='Document'
                            and r.get('DocumentStorageID')]

            if book_updates:
                ids = [i for i,_ in book_updates]
                case = ' '.join([f"WHEN {i} THEN %s" for i,_ in book_updates])
                values = [c for _,c in book_updates]
                fmt_in = ','.join(['%s'] * len(ids))
                cursor.execute(f"""
                    UPDATE Book_Inventory
                    SET BookCondition = CASE Copy_ID {case} ELSE BookCondition END,
                        Availability = 'Available'
                    WHERE Copy_ID IN ({fmt_in})
                """, tuple(values + ids))

            if doc_updates:
                ids = [i for i,_ in doc_updates]
                case = ' '.join([f"WHEN {i} THEN %s" for i,_ in doc_updates])
                values = [c for _,c in doc_updates]
                fmt_in = ','.join(['%s'] * len(ids))
                cursor.execute(f"""
                    UPDATE Document_Inventory
                    SET `Condition` = CASE Storage_ID {case} ELSE `Condition` END,
                        Availability = 'Available'
                    WHERE Storage_ID IN ({fmt_in})
                """, tuple(values + ids))

        # Determine final status by checking if any physical items remain in 'Borrowed' state
        # If none remain, mark overall as 'Returned', else keep 'Not Returned'
        borrow_id = data['borrowId']
        cursor.execute(
            """
            SELECT ItemType, BookCopyID, DocumentStorageID
            FROM BorrowedItems WHERE BorrowID=%s
            """,
            (borrow_id,)
        )
        all_items = cursor.fetchall() or []
        remaining_copy_ids = [r['BookCopyID'] for r in all_items if r['ItemType']=='Book' and r.get('BookCopyID')]
        remaining_doc_ids = [r['DocumentStorageID'] for r in all_items if r['ItemType']=='Document' and r.get('DocumentStorageID')]

        still_borrowed = False
        if remaining_copy_ids:
            fmtr = ','.join(['%s'] * len(remaining_copy_ids))
            cursor.execute(f"SELECT COUNT(*) AS c FROM Book_Inventory WHERE Copy_ID IN ({fmtr}) AND Availability='Borrowed'", tuple(remaining_copy_ids))
            if (cursor.fetchone() or {}).get('c', 0) > 0:
                still_borrowed = True
        if (not still_borrowed) and remaining_doc_ids:
            fmtrd = ','.join(['%s'] * len(remaining_doc_ids))
            cursor.execute(f"SELECT COUNT(*) AS c FROM Document_Inventory WHERE Storage_ID IN ({fmtrd}) AND Availability='Borrowed'", tuple(remaining_doc_ids))
            if (cursor.fetchone() or {}).get('c', 0) > 0:
                still_borrowed = True

        final_status = 'Returned' if not still_borrowed else 'Not Returned'
        cursor.execute("UPDATE BorrowTransactions SET ReturnStatus=%s WHERE BorrowID=%s", (final_status, borrow_id))

        notify_return_recorded(cursor, data['borrowId'])
        conn.commit()

        cursor.execute("SELECT * FROM ReturnTransactions WHERE ReturnID=%s", (return_id,))
        return_transaction = cursor.fetchone()
        cursor.execute("SELECT * FROM ReturnedItems WHERE ReturnID=%s", (return_id,))
        returned_items = cursor.fetchall() or []

        return jsonify({'transaction': return_transaction, 'items': returned_items}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# --- List all return transactions and their items ---
@borrowreturn_bp.route('/return', methods=['GET'])
def list_return_transactions():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM ReturnTransactions")
        transactions = cursor.fetchall() or []

        return_ids = [tx['ReturnID'] for tx in transactions]
        items_by_return = {}
        if return_ids:
            fmt = ','.join(['%s'] * len(return_ids))
            cursor.execute(f"SELECT * FROM ReturnedItems WHERE ReturnID IN ({fmt})", tuple(return_ids))
            for item in cursor.fetchall() or []:
                items_by_return.setdefault(item['ReturnID'], []).append(item)

        for tx in transactions:
            tx['items'] = items_by_return.get(tx['ReturnID'], [])

        return jsonify(transactions), 200
    finally:
        cursor.close()
        conn.close()


# --- Get due date for a borrow transaction (always 200) ---
@borrowreturn_bp.route('/borrow/<int:borrow_id>/due-date', methods=['GET'])
def get_borrow_due_date(borrow_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT MAX(ReturnDate) AS ReturnDate
            FROM ReturnTransactions
            WHERE BorrowID=%s
        """, (borrow_id,))
        row = cursor.fetchone()
        return jsonify({'BorrowID': borrow_id, 'DueDate': row['ReturnDate'] if row else None}), 200
    finally:
        cursor.close()
        conn.close()


# --- Mark borrowed item(s) as LOST (no return condition) ---
@borrowreturn_bp.route('/lost', methods=['POST'])
def mark_items_lost():
    data = request.json or {}
    borrow_id = data.get('borrowId')
    items = data.get('items') or []
    if not borrow_id or not items:
        return jsonify({'error': 'borrowId and items are required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        # Fetch target borrowed items
        ids = [it.get('borrowedItemId') for it in items if it.get('borrowedItemId')]
        if not ids:
            return jsonify({'error': 'No valid borrowedItemId provided'}), 400
        fmt = ','.join(['%s'] * len(ids))
        cursor.execute(f"""
            SELECT BorrowedItemID, BorrowID, ItemType, BookCopyID, DocumentStorageID
            FROM BorrowedItems
            WHERE BorrowedItemID IN ({fmt}) AND BorrowID=%s
        """, tuple(ids + [borrow_id]))
        rows = cursor.fetchall() or []

    # Update availability to 'Lost' for physical items
        book_ids = [r['BookCopyID'] for r in rows if r['ItemType'] == 'Book' and r.get('BookCopyID')]
        doc_storage_ids = [r['DocumentStorageID'] for r in rows if r['ItemType'] == 'Document' and r.get('DocumentStorageID')]

        if book_ids:
            fmtb = ','.join(['%s'] * len(book_ids))
            cursor.execute(f"UPDATE Book_Inventory SET Availability='Lost' WHERE Copy_ID IN ({fmtb})", tuple(book_ids))
        if doc_storage_ids:
            fmtd = ','.join(['%s'] * len(doc_storage_ids))
            cursor.execute(f"UPDATE Document_Inventory SET Availability='Lost' WHERE Storage_ID IN ({fmtd})", tuple(doc_storage_ids))

        # Create a ReturnTransactions row to log the lost event and fines (if any)
        remarks = (data.get('remarks') or '').strip()
        cursor.execute(
            """
            INSERT INTO ReturnTransactions (BorrowID, ReturnDate, ReceivedByStaffID, Remarks)
            VALUES (%s, CURDATE(), %s, %s)
            """,
            (borrow_id, data.get('receivedByStaffId'), f"[LOST] {remarks}" if remarks else "[LOST]")
        )
        return_id = cursor.lastrowid

        # Insert ReturnedItems rows for each lost item, capturing fines if provided
        # Use ReturnCondition='Lost' to denote lost items
        ri_params = []
        for it in data.get('items') or []:
            bid = it.get('borrowedItemId')
            if not bid:
                continue
            fine = float(it.get('fine') or 0)
            fine_paid = it.get('finePaid') or 'No'
            # Normalize boolean to Yes/No if needed
            if isinstance(fine_paid, bool):
                fine_paid = 'Yes' if fine_paid else 'No'
            ri_params.append((return_id, bid, 'Lost', fine, fine_paid))
        if ri_params:
            cursor.executemany(
                """
                INSERT INTO ReturnedItems (ReturnID, BorrowedItemID, ReturnCondition, Fine, FinePaid)
                VALUES (%s, %s, %s, %s, %s)
                """,
                ri_params
            )

        # Auto-close borrow if no remaining physical items are still marked Borrowed
        # Check for any physical borrowed items still Borrowed in inventory
        cursor.execute("""
            SELECT ItemType, BookCopyID, DocumentStorageID
            FROM BorrowedItems WHERE BorrowID=%s
        """, (borrow_id,))
        all_items = cursor.fetchall() or []
        remaining_copy_ids = [r['BookCopyID'] for r in all_items if r['ItemType']=='Book' and r.get('BookCopyID')]
        remaining_doc_ids = [r['DocumentStorageID'] for r in all_items if r['ItemType']=='Document' and r.get('DocumentStorageID')]

        still_borrowed = False
        if remaining_copy_ids:
            fmtr = ','.join(['%s'] * len(remaining_copy_ids))
            cursor.execute(f"SELECT COUNT(*) AS c FROM Book_Inventory WHERE Copy_ID IN ({fmtr}) AND Availability='Borrowed'", tuple(remaining_copy_ids))
            if (cursor.fetchone() or {}).get('c', 0) > 0:
                still_borrowed = True
        if (not still_borrowed) and remaining_doc_ids:
            fmtrd = ','.join(['%s'] * len(remaining_doc_ids))
            cursor.execute(f"SELECT COUNT(*) AS c FROM Document_Inventory WHERE Storage_ID IN ({fmtrd}) AND Availability='Borrowed'", tuple(remaining_doc_ids))
            if (cursor.fetchone() or {}).get('c', 0) > 0:
                still_borrowed = True

        if not still_borrowed:
            # Close the transaction: mark as 'Returned' when no items are left in Borrowed state
            cursor.execute("UPDATE BorrowTransactions SET ReturnStatus=%s WHERE BorrowID=%s", ('Returned', borrow_id))

        conn.commit()
        return jsonify({
            'message': 'Marked as lost',
            'updatedBookCopies': len(book_ids),
            'updatedDocCopies': len(doc_storage_ids),
            'returnId': return_id,
            'lostItemsRecorded': len(ri_params)
        }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()