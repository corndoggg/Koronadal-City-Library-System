from flask import Blueprint, jsonify, request
from ..db import get_db_connection

inventory_bp = Blueprint('inventory', __name__)

# 🔍 Get all inventory copies for a book
@inventory_bp.route('/inventory/<int:book_id>', methods=['GET'])
def get_inventory(book_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            Copy_ID, 
            Accession_Number AS accessionNumber, 
            Availability AS availability, 
            Physical_Status AS physicalStatus, 
            BookCondition AS `condition`, 
            BookLocation AS location
        FROM Book_Inventory 
        WHERE Book_ID = %s
    """, (book_id,))
    inventory = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(inventory)

# 🔍 Get a specific copy by Copy_ID
@inventory_bp.route('/inventory/copy/<int:copy_id>', methods=['GET'])
def get_inventory_copy(copy_id):  # ✅ fixed: parameter should be copy_id
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            Copy_ID, 
            Accession_Number AS accessionNumber, 
            Availability AS availability, 
            Physical_Status AS physicalStatus, 
            BookCondition AS `condition`,
            BookLocation AS location
        FROM Book_Inventory 
        WHERE Copy_ID = %s
    """, (copy_id,))
    inventory = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(inventory)

# ➕ Add inventory copies for a book
@inventory_bp.route('/inventory/<int:book_id>', methods=['POST'])
def add_inventory(book_id):
    copy = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Book_Inventory (
            Book_ID, Accession_Number, Availability, 
            Physical_Status, BookCondition, BookLocation
        ) VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        book_id,
        copy['accessionNumber'],
        copy['availability'],
        copy['physicalStatus'],
        copy['condition'],
        copy['location']
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Copy added'})

# ✏️ Update a specific inventory copy
@inventory_bp.route('/inventory/<int:book_id>/<int:copy_id>', methods=['PUT'])
def update_copy(book_id, copy_id):
    copy = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE Book_Inventory 
        SET 
            Accession_Number = %s, 
            Availability = %s, 
            Physical_Status = %s,
            BookCondition = %s, 
            BookLocation = %s 
        WHERE 
            Copy_ID = %s AND Book_ID = %s
    """, (
        copy['accessionNumber'],
        copy['availability'],
        copy['physicalStatus'],
        copy['condition'],
        copy['location'],
        copy_id,
        book_id
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Copy updated'})