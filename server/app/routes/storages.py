from flask import Blueprint, jsonify, request
from ..db import get_db_connection

storages_bp = Blueprint('storages', __name__)

# Get all storages
@storages_bp.route('/storages', methods=['GET'])
def get_storages():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT ID, Name, Capacity FROM Storages")
    storages = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(storages)

# Add a storage
@storages_bp.route('/storages', methods=['POST'])
def add_storage():
    data = request.json
    name = data.get('name')
    capacity = data.get('capacity', 0)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO Storages (Name, Capacity) VALUES (%s, %s)", (name, capacity))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Storage added'}), 201

# Update a storage
@storages_bp.route('/storages/<int:storage_id>', methods=['PUT'])
def update_storage(storage_id):
    data = request.json
    name = data.get('name')
    capacity = data.get('capacity', 0)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE Storages SET Name=%s, Capacity=%s WHERE ID=%s", (name, capacity, storage_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Storage updated'})

# Delete a storage
@storages_bp.route('/storages/<int:storage_id>', methods=['DELETE'])
def delete_storage(storage_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM Storages WHERE ID=%s", (storage_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Storage deleted'})