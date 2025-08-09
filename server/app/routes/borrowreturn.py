from flask import Blueprint, request, jsonify
from app.db import get_db_connection

borrowreturn_bp = Blueprint('borrowreturn', __name__)

# --- Add a new borrow transaction ---
@borrowreturn_bp.route('/borrow', methods=['POST'])
def add_borrow_transaction():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        INSERT INTO BorrowTransactions (BorrowerID, Purpose, ApprovalStatus, ApprovedByStaffID, RetrievalStatus, ReturnStatus, BorrowDate)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        data['borrowerId'],
        data.get('purpose', ''),
        data.get('approvalStatus', 'Pending'),
        data.get('approvedByStaffId'),
        data.get('retrievalStatus', 'Pending'),
        data.get('returnStatus', 'Not Returned'),
        data.get('borrowDate')
    ))
    borrow_id = cursor.lastrowid

    # Insert Borrowed Items
    borrowed_items = []
    for item in data.get('items', []):
        cursor.execute("""
            INSERT INTO BorrowedItems (BorrowID, ItemType, BookCopyID, DocumentStorageID, InitialCondition)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            borrow_id,
            item['itemType'],
            item.get('bookCopyId'),
            item.get('documentStorageId'),
            item.get('initialCondition', '')
        ))
        borrowed_item_id = cursor.lastrowid
        borrowed_items.append({
            'BorrowedItemID': borrowed_item_id,
            'BorrowID': borrow_id,
            **item
        })

        # Mark book/document as borrowed (update availability)
        if item['itemType'] == 'Book' and item.get('bookCopyId'):
            cursor.execute("UPDATE Book_Inventory SET Availability='Borrowed' WHERE Copy_ID=%s", (item['bookCopyId'],))
        elif item['itemType'] == 'Document' and item.get('documentStorageId'):
            cursor.execute("UPDATE Document_Inventory SET Availability='Borrowed' WHERE Storage_ID=%s", (item['documentStorageId'],))

    # --- Automatically create a Return Transaction with the return date ---
    return_date = data.get('returnDate')
    if return_date:
        cursor.execute("""
            INSERT INTO ReturnTransactions (BorrowID, ReturnDate)
            VALUES (%s, %s)
        """, (borrow_id, return_date))

    conn.commit()

    cursor.execute("""
        SELECT * FROM BorrowTransactions WHERE BorrowID=%s
    """, (borrow_id,))
    borrow_transaction = cursor.fetchone()

    cursor.execute("""
        SELECT * FROM BorrowedItems WHERE BorrowID=%s
    """, (borrow_id,))
    items = cursor.fetchall()

    cursor.close()
    conn.close()
    return jsonify({'transaction': borrow_transaction, 'items': items}), 201

# --- List all borrow transactions and their items ---
@borrowreturn_bp.route('/borrow', methods=['GET'])
def list_borrow_transactions():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM BorrowTransactions")
    transactions = cursor.fetchall()

    borrow_ids = [tx['BorrowID'] for tx in transactions]
    if borrow_ids:
        format_strings = ','.join(['%s'] * len(borrow_ids))
        # Get all BorrowedItems in one query
        cursor.execute(f"SELECT * FROM BorrowedItems WHERE BorrowID IN ({format_strings})", tuple(borrow_ids))
        all_items = cursor.fetchall()
        items_by_borrow = {}
        for item in all_items:
            items_by_borrow.setdefault(item['BorrowID'], []).append(item)
        # Get all ReturnDates in one query
        cursor.execute(f"SELECT BorrowID, ReturnDate FROM ReturnTransactions WHERE BorrowID IN ({format_strings})", tuple(borrow_ids))
        all_returns = cursor.fetchall()
        returns_by_borrow = {ret['BorrowID']: ret['ReturnDate'] for ret in all_returns}
    else:
        items_by_borrow = {}
        returns_by_borrow = {}

    for tx in transactions:
        tx['items'] = items_by_borrow.get(tx['BorrowID'], [])
        tx['ReturnDate'] = returns_by_borrow.get(tx['BorrowID'])

    cursor.close()
    conn.close()
    return jsonify(transactions)

# --- Add a return transaction ---
@borrowreturn_bp.route('/return', methods=['POST'])
def add_return_transaction():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

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

    returned_items = []
    for item in data.get('items', []):
        cursor.execute("""
            INSERT INTO ReturnedItems (ReturnID, BorrowedItemID, ReturnCondition, Fine, FinePaid)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            return_id,
            item['borrowedItemId'],
            item.get('returnCondition', ''),
            item.get('fine', 0.00),
            item.get('finePaid', 'No')
        ))

        cursor.execute("SELECT ItemType, BookCopyID, DocumentStorageID FROM BorrowedItems WHERE BorrowedItemID=%s", (item['borrowedItemId'],))
        borrowed_item = cursor.fetchone()
        if borrowed_item['ItemType'] == 'Book' and borrowed_item['BookCopyID']:
            cursor.execute("""
                UPDATE Book_Inventory SET BookCondition=%s, Availability='Available' WHERE Copy_ID=%s
            """, (item.get('returnCondition', ''), borrowed_item['BookCopyID']))
        elif borrowed_item['ItemType'] == 'Document' and borrowed_item['DocumentStorageID']:
            cursor.execute("""
                UPDATE Document_Inventory SET `Condition`=%s, Availability='Available' WHERE Storage_ID=%s
            """, (item.get('returnCondition', ''), borrowed_item['DocumentStorageID']))

        returned_items.append({
            'ReturnedItemID': cursor.lastrowid,
            'ReturnID': return_id,
            **item
        })

    cursor.execute("""
        UPDATE BorrowTransactions SET RetrievalStatus='Returned', ReturnStatus='Returned' WHERE BorrowID=%s
    """, (data['borrowId'],))

    conn.commit()

    cursor.execute("SELECT * FROM ReturnTransactions WHERE ReturnID=%s", (return_id,))
    return_transaction = cursor.fetchone()
    cursor.execute("SELECT * FROM ReturnedItems WHERE ReturnID=%s", (return_id,))
    items = cursor.fetchall()

    cursor.close()
    conn.close()
    return jsonify({'transaction': return_transaction, 'items': items}), 201

# --- List all return transactions and their items ---
@borrowreturn_bp.route('/return', methods=['GET'])
def list_return_transactions():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM ReturnTransactions")
    transactions = cursor.fetchall()

    return_ids = [tx['ReturnID'] for tx in transactions]
    if return_ids:
        format_strings = ','.join(['%s'] * len(return_ids))
        cursor.execute(f"SELECT * FROM ReturnedItems WHERE ReturnID IN ({format_strings})", tuple(return_ids))
        all_items = cursor.fetchall()
        items_by_return = {}
        for item in all_items:
            items_by_return.setdefault(item['ReturnID'], []).append(item)
    else:
        items_by_return = {}

    for tx in transactions:
        tx['items'] = items_by_return.get(tx['ReturnID'], [])

    cursor.close()
    conn.close()
    return jsonify(transactions)

# --- Get all borrow transactions for a specific borrower ---
@borrowreturn_bp.route('/borrow/borrower/<int:borrower_id>', methods=['GET'])
def get_borrower_transactions(borrower_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM BorrowTransactions WHERE BorrowerID=%s", (borrower_id,))
    transactions = cursor.fetchall()

    borrow_ids = [tx['BorrowID'] for tx in transactions]
    if borrow_ids:
        format_strings = ','.join(['%s'] * len(borrow_ids))
        cursor.execute(f"SELECT * FROM BorrowedItems WHERE BorrowID IN ({format_strings})", tuple(borrow_ids))
        all_items = cursor.fetchall()
        items_by_borrow = {}
        for item in all_items:
            items_by_borrow.setdefault(item['BorrowID'], []).append(item)
        cursor.execute(f"SELECT BorrowID, ReturnDate FROM ReturnTransactions WHERE BorrowID IN ({format_strings})", tuple(borrow_ids))
        all_returns = cursor.fetchall()
        returns_by_borrow = {ret['BorrowID']: ret['ReturnDate'] for ret in all_returns}
    else:
        items_by_borrow = {}
        returns_by_borrow = {}

    for tx in transactions:
        tx['items'] = items_by_borrow.get(tx['BorrowID'], [])
        tx['ReturnDate'] = returns_by_borrow.get(tx['BorrowID'])

    cursor.close()
    conn.close()
    return jsonify(transactions)

# --- Approve a borrow transaction ---
@borrowreturn_bp.route('/borrow/<int:borrow_id>/approve', methods=['PUT'])
def approve_borrow_transaction(borrow_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        UPDATE BorrowTransactions
        SET ApprovalStatus='Approved'
        WHERE BorrowID=%s
    """, (borrow_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Borrow transaction approved.'}), 200

# --- Reject a borrow transaction ---
@borrowreturn_bp.route('/borrow/<int:borrow_id>/reject', methods=['PUT'])
def reject_borrow_transaction(borrow_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        UPDATE BorrowTransactions
        SET ApprovalStatus='Rejected'
        WHERE BorrowID=%s
    """, (borrow_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Borrow transaction rejected.'}), 200

# --- Set document-only transaction as retrieved ---
@borrowreturn_bp.route('/borrow/<int:borrow_id>/retrieved', methods=['PUT'])
def set_borrow_transaction_retrieved(borrow_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        UPDATE BorrowTransactions
        SET RetrievalStatus='Retrieved'
        WHERE BorrowID=%s
    """, (borrow_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Borrow transaction set as retrieved.'}), 200

# --- Get due date for a borrow transaction ---
@borrowreturn_bp.route('/borrow/<int:borrow_id>/due-date', methods=['GET'])
def get_borrow_due_date(borrow_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT ReturnDate FROM ReturnTransactions WHERE BorrowID=%s", (borrow_id,))
    result = cursor.fetchall()  # fetch all results
    cursor.close()
    conn.close()
    if result and result[0].get('ReturnDate'):
        return jsonify({'BorrowID': borrow_id, 'DueDate': result[0]['ReturnDate']}), 200
    else:
        return jsonify({'BorrowID': borrow_id, 'DueDate': None}), 404

# --- Approve a user account ---
@borrowreturn_bp.route('/users/<int:user_id>/approve', methods=['PUT'])
def approve_user_account(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # Update AccountStatus to 'Approved' for borrowers
    cursor.execute("""
        UPDATE Borrowers
        SET AccountStatus='Registered'
        WHERE UserID=%s
    """, (user_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'User approved.'}), 200

# --- Reject a user account ---
@borrowreturn_bp.route('/users/<int:user_id>/reject', methods=['PUT'])
def reject_user_account(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # Update AccountStatus to 'Rejected' for borrowers
    cursor.execute("""
        UPDATE Borrowers
        SET AccountStatus='Rejected'
        WHERE UserID=%s
    """, (user_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'User rejected.'}), 200