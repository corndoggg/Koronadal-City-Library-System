from flask import Blueprint, jsonify, request
from ..db import get_db_connection

inventory_bp = Blueprint('inventory', __name__)

# 🔍 Get all inventory copies for a book
@inventory_bp.route('/books/inventory/<int:book_id>', methods=['GET'])
def get_inventory(book_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            bi.Copy_ID, 
            bi.Accession_Number AS accessionNumber, 
            bi.Availability AS availability, 
            bi.Physical_Status AS physicalStatus, 
            bi.BookCondition AS `condition`, 
            bi.StorageLocation AS location,      -- <--- return the ID
            s.Name AS locationName               -- <--- return the name
        FROM Book_Inventory bi
        LEFT JOIN storages s ON bi.StorageLocation = s.ID
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
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            bi.Copy_ID, 
            bi.Accession_Number AS accessionNumber, 
            bi.Availability AS availability, 
            bi.Physical_Status AS physicalStatus, 
            bi.BookCondition AS `condition`,
            bi.StorageLocation AS location,
            s.Name AS locationName
        FROM Book_Inventory bi
        LEFT JOIN storages s ON bi.StorageLocation = s.ID
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
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Book_Inventory (
            Book_ID, Accession_Number, Availability, 
            Physical_Status, BookCondition, StorageLocation
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
@inventory_bp.route('/books/inventory/<int:book_id>/<int:copy_id>', methods=['PUT'])
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
            StorageLocation = %s 
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