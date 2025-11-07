from decimal import Decimal
from flask import Blueprint, jsonify, request
from ..db import get_db_connection

inventory_bp = Blueprint('inventory', __name__)

# 🔍 Get all inventory copies for a book
@inventory_bp.route('/books/inventory/<int:book_id>', methods=['GET'])
def get_inventory(book_id):
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            bi.Copy_ID, 
            bi.Accession_Number AS accessionNumber, 
            bi.Availability AS availability, 
            bi.BookCondition AS `condition`, 
            bi.StorageLocation AS location,
            bi.UpdatedOn AS updatedOn,
            bi.LostOn AS lostOn,
            bi.FoundOn AS foundOn,
            s.Name AS locationName
        FROM Book_Inventory bi
        LEFT JOIN Storages s ON bi.StorageLocation = s.ID
        WHERE bi.Book_ID = %s
    """, (book_id,))
    inventory = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(inventory)

# 🔍 Get a specific copy by Copy_ID
@inventory_bp.route('/books/inventory/copy/<int:copy_id>', methods=['GET'])
def get_inventory_copy(copy_id):
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            bi.Copy_ID,
            bi.Book_ID, 
            bi.Accession_Number AS accessionNumber, 
            bi.Availability AS availability, 
            bi.BookCondition AS `condition`,
            bi.StorageLocation AS location,
            bi.UpdatedOn AS updatedOn,
            bi.LostOn AS lostOn,
            bi.FoundOn AS foundOn,
            s.Name AS locationName
        FROM Book_Inventory bi
        LEFT JOIN Storages s ON bi.StorageLocation = s.ID
        WHERE bi.Copy_ID = %s
    """, (copy_id,))
    inventory = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(inventory)

# ➕ Add inventory copies for a book
@inventory_bp.route('/books/inventory/<int:book_id>', methods=['POST'])
def add_inventory(book_id):
    copy = request.json
    if not copy:
        return jsonify({'error': 'Missing JSON body'}), 400
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Book_Inventory (
            Book_ID, Accession_Number, Availability,
            BookCondition, StorageLocation, UpdatedOn, LostOn, FoundOn
    ) VALUES (%s, %s, %s, %s, %s, NOW(), CASE WHEN %s = 'Lost' THEN NOW() ELSE NULL END, NULL)
    """, (
        book_id,
        copy['accessionNumber'],
        copy['availability'],
        copy['condition'],
        copy['location'],
        copy['availability']
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Copy added'})

# ✏️ Update a specific inventory copy
@inventory_bp.route('/books/inventory/<int:book_id>/<int:copy_id>', methods=['PUT'])
def update_copy(book_id, copy_id):
    payload = request.json or {}
    if not payload:
        return jsonify({'error': 'Missing JSON body'}), 400
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    select_cursor = conn.cursor()
    select_cursor.execute(
        """
        SELECT Accession_Number, Availability, BookCondition, StorageLocation
        FROM Book_Inventory
        WHERE Copy_ID = %s AND Book_ID = %s
        """,
        (copy_id, book_id)
    )
    existing = select_cursor.fetchone()
    select_cursor.close()

    if not existing:
        conn.close()
        return jsonify({'error': 'Inventory copy not found'}), 404

    accession_existing, prev_availability, condition_existing, location_existing = existing

    prev_availability = prev_availability or 'Available'
    accession_number = payload.get('accessionNumber', accession_existing)
    new_availability = payload.get('availability', prev_availability)
    condition = payload.get('condition', condition_existing)
    location = payload.get('location', location_existing)

    if accession_number is None:
        accession_number = accession_existing
    if accession_number is not None:
        accession_number = str(accession_number)

    if condition is None:
        condition = condition_existing
    if condition is not None:
        condition = str(condition)

    if new_availability is None:
        new_availability = prev_availability
    if new_availability is not None:
        new_availability = str(new_availability)

    if prev_availability is not None:
        prev_availability = str(prev_availability)
    else:
        prev_availability = 'Available'

    location_value = location if location is not None else location_existing
    if isinstance(location_value, (bytes, bytearray, memoryview)):
        decoded = bytes(location_value).decode().strip()
        location_value = decoded or None
    elif isinstance(location_value, Decimal):
        location_value = int(location_value)
    elif isinstance(location_value, (int, float)):
        location_value = int(location_value)
    elif isinstance(location_value, str):
        trimmed = location_value.strip()
        if trimmed == '':
            location_value = None
        elif trimmed.isdigit():
            location_value = int(trimmed)
        else:
            location_value = trimmed
    elif location_value is not None:
        location_value = str(location_value)

    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE Book_Inventory
        SET 
            Accession_Number = %s,
            Availability = %s,
            BookCondition = %s,
            StorageLocation = %s,
            UpdatedOn = NOW(),
            LostOn = CASE 
                WHEN %s = 'Lost' AND %s <> 'Lost' THEN NOW()
                ELSE LostOn
            END,
            FoundOn = CASE
                WHEN %s = 'Lost' THEN NULL
                WHEN %s <> 'Lost' AND %s = 'Lost' THEN NOW()
                ELSE FoundOn
            END
        WHERE Copy_ID = %s AND Book_ID = %s
        """,
        (
            accession_number,
            new_availability,
            condition,
            location_value,
            new_availability,
            prev_availability,
            new_availability,
            new_availability,
            prev_availability,
            copy_id,
            book_id
        )
    )

    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Copy updated'})