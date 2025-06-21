from flask import Blueprint, jsonify, request
from ..db import get_db_connection

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route('/inventory/<int:book_id>', methods=['GET'])
def get_inventory(book_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT Copy_ID, Accession_Number, Availability, Physical_Status, BookCondition, BookLocation
        FROM Book_Inventory WHERE Book_ID = %s
    """, (book_id,))
    inventory = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(inventory)

@inventory_bp.route('/inventory/<int:book_id>', methods=['POST'])
def add_inventory(book_id):
    copies = request.json.get('copies', [])
    conn = get_db_connection()
    cursor = conn.cursor()
    for copy in copies:
        cursor.execute("""
            INSERT INTO Book_Inventory (Book_ID, Accession_Number, Availability, Physical_Status, BookCondition, BookLocation)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (book_id, copy['accessionNumber'], copy['availability'],
              copy['physicalStatus'], copy['condition'], copy['location']))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Copies added'})

@inventory_bp.route('/inventory/<int:book_id>/<int:copy_id>', methods=['PUT'])
def update_copy(book_id, copy_id):
    copy = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE Book_Inventory SET Accession_Number=%s, Availability=%s, Physical_Status=%s,
        BookCondition=%s, BookLocation=%s WHERE ID=%s AND Book_ID=%s
    """, (copy['accessionNumber'], copy['availability'], copy['physicalStatus'],
          copy['condition'], copy['location'], copy_id, book_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Copy updated'})