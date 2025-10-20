from flask import Blueprint, request, jsonify
from app.db import get_db_connection

document_inventory_bp = Blueprint('document_inventory', __name__)

# Get all inventory entries for a specific document
@document_inventory_bp.route('/documents/inventory/<int:document_id>', methods=['GET'])
def get_inventory_by_document(document_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            di.Storage_ID,
            di.Document_ID,
            di.Availability AS availability,
            di.`Condition` AS `condition`,
            di.StorageLocation AS location,
            di.UpdatedOn AS updatedOn,
            di.LostOn AS lostOn,
            s.Name as Location
        FROM Document_Inventory di
        LEFT JOIN Storages s ON di.StorageLocation = s.ID
        WHERE di.Document_ID = %s
    """, (document_id,))
    entries = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(entries)

# Add inventory copy for a document
@document_inventory_bp.route('/documents/inventory/<int:document_id>', methods=['POST'])
def add_inventory(document_id):
    data = request.json
    if not data:
        return jsonify({'error': 'Missing JSON body'}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Document_Inventory (Document_ID, Availability, `Condition`, `StorageLocation`, UpdatedOn, LostOn)
        VALUES (%s, %s, %s, %s, NOW(), CASE WHEN %s = 'Lost' THEN NOW() ELSE NULL END)
    """, (
        document_id, data.get('availability'), data.get('condition'), data.get('location'), data.get('availability')
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Inventory added'}), 201

# Update inventory copy
@document_inventory_bp.route('/documents/inventory/<int:document_id>/<int:storage_id>', methods=['PUT'])
def update_inventory(document_id, storage_id):
    data = request.json
    if not data:
        return jsonify({'error': 'Missing JSON body'}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE Document_Inventory
        SET Availability=%s, `Condition`=%s, `StorageLocation`=%s, UpdatedOn=NOW(),
            LostOn = CASE WHEN %s = 'Lost' THEN NOW() ELSE LostOn END
        WHERE Document_ID=%s AND Storage_ID=%s
    """, (
        data.get('availability'), data.get('condition'), data.get('location'),
        data.get('availability'),
        document_id, storage_id
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Inventory updated'})

# Delete inventory copy
@document_inventory_bp.route('/documents/inventory/<int:document_id>/<int:storage_id>', methods=['DELETE'])
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

# Get inventory entry by Storage_ID (for any document)
@document_inventory_bp.route('/documents/inventory/storage/<int:storage_id>', methods=['GET'])
def get_inventory_by_storage(storage_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            di.Storage_ID,
            di.Document_ID,
            di.Availability AS availability,
            di.`Condition` AS `condition`,
            di.StorageLocation AS location,
            di.UpdatedOn AS updatedOn,
            di.LostOn AS lostOn,
            s.Name as Location
        FROM Document_Inventory di
        LEFT JOIN Storages s ON di.StorageLocation = s.ID
        WHERE di.Storage_ID = %s
    """, (storage_id,))
    entry = cursor.fetchone()
    cursor.close()
    conn.close()
    if entry:
        return jsonify(entry)
    else:
        return jsonify({}), 404
