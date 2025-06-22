from flask import Blueprint, request, jsonify
from app.db import get_db_connection

document_inventory_bp = Blueprint('document_inventory', __name__)

# Get all inventory entries for a specific document
@document_inventory_bp.route('/documents/<int:document_id>/inventory', methods=['GET'])
def get_inventory_by_document(document_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Document_Inventory WHERE Document_ID = %s", (document_id,))
    entries = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(entries)

# Add inventory copy for a document
@document_inventory_bp.route('/documents/<int:document_id>/inventory', methods=['POST'])
def add_inventory(document_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Document_Inventory (Storage_ID, Document_ID, Availability, `Condition`, `Location`)
        VALUES (%s, %s, %s, %s, %s)
    """, (
        data['storageId'], document_id, data.get('availability'), data.get('condition'), data.get('location')
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Inventory added'}), 201

# Update inventory copy
@document_inventory_bp.route('/documents/<int:document_id>/inventory/<int:storage_id>', methods=['PUT'])
def update_inventory(document_id, storage_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE Document_Inventory
        SET Availability=%s, `Condition`=%s, `Location`=%s
        WHERE Document_ID=%s AND Storage_ID=%s
    """, (
        data.get('availability'), data.get('condition'), data.get('location'),
        document_id, storage_id
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Inventory updated'})

# Delete inventory copy
@document_inventory_bp.route('/documents/<int:document_id>/inventory/<int:storage_id>', methods=['DELETE'])
def delete_inventory(document_id, storage_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM Document_Inventory
        WHERE Document_ID=%s AND Storage_ID=%s
    """, (document_id, storage_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Inventory deleted'})
