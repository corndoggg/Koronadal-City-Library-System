from flask import Blueprint, request, jsonify
from app.db import get_db_connection

borrowreturn_bp = Blueprint('borrowreturn', __name__)

# --- Add a new borrow transaction ---
@borrowreturn_bp.route('/borrow', methods=['POST'])
def add_borrow_transaction():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Insert Borrow Transaction
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

    conn.commit()

    # Return transaction details
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
    for tx in transactions:
        cursor.execute("SELECT * FROM BorrowedItems WHERE BorrowID=%s", (tx['BorrowID'],))
        tx['items'] = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(transactions)

# --- Add a return transaction ---
@borrowreturn_bp.route('/return', methods=['POST'])
def add_return_transaction():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Insert Return Transaction
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

    # Insert Returned Items and update book/document condition and availability
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

        # Get item type and IDs
        cursor.execute("SELECT ItemType, BookCopyID, DocumentStorageID FROM BorrowedItems WHERE BorrowedItemID=%s", (item['borrowedItemId'],))
        borrowed_item = cursor.fetchone()
        # Update condition and availability
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

    # Update BorrowTransaction status
    cursor.execute("""
        UPDATE BorrowTransactions SET RetrievalStatus='Returned', ReturnStatus='Returned' WHERE BorrowID=%s
    """, (data['borrowId'],))

    conn.commit()

    # Return transaction details
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
    for tx in transactions:
        cursor.execute("SELECT * FROM ReturnedItems WHERE ReturnID=%s", (tx['ReturnID'],))
        tx['items'] = cursor.fetchall()
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
    for tx in transactions:
        cursor.execute("SELECT * FROM BorrowedItems WHERE BorrowID=%s", (tx['BorrowID'],))
        tx['items'] = cursor.fetchall()
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