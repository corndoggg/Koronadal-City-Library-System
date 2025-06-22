from flask import Blueprint, request, jsonify
from ..db import get_db_connection

documents_bp = Blueprint('documents', __name__)

# Get all documents
@documents_bp.route('/documents', methods=['GET'])
def get_documents():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Documents")
    docs = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(docs)

# Get single document
@documents_bp.route('/documents/<int:doc_id>', methods=['GET'])
def get_document(doc_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Documents WHERE Document_ID = %s", (doc_id,))
    doc = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(doc or {})

# Create new document
@documents_bp.route('/documents', methods=['POST'])
def create_document():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Documents (Document_ID, Title, Author, Category, Department, Classification, Year, Sensitivity, File_Path)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        data['documentId'], data['title'], data.get('author'), data.get('category'),
        data.get('department'), data.get('classification'), data.get('year'),
        data.get('sensitivity'), data.get('filePath')
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Document added'}), 201

# Update document
@documents_bp.route('/documents/<int:doc_id>', methods=['PUT'])
def update_document(doc_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE Documents
        SET Title=%s, Author=%s, Category=%s, Department=%s, Classification=%s,
            Year=%s, Sensitivity=%s, File_Path=%s
        WHERE Document_ID=%s
    """, (
        data['title'], data.get('author'), data.get('category'), data.get('department'),
        data.get('classification'), data.get('year'), data.get('sensitivity'),
        data.get('filePath'), doc_id
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Document updated'})

# Delete document
@documents_bp.route('/documents/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM Documents WHERE Document_ID = %s", (doc_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Document deleted'})
