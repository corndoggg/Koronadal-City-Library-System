import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from ..db import get_db_connection
from ..utils import allowed_file

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

# Upload document with metadata
@documents_bp.route('/documents/upload', methods=['POST'])
def upload_document():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed. Only PDF supported.'}), 400

    metadata = request.form.to_dict()
    required_fields = ['title', 'author', 'category', 'department', 'classification', 'year', 'sensitivity']
    if not all(field in metadata for field in required_fields):
        return jsonify({'error': 'Missing required metadata fields.'}), 400

    filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4()}_{filename}"
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)
    save_path = os.path.join(upload_folder, unique_filename)
    print(f"Saving file to {save_path}")
    file.save(save_path)

    # Save only public URL path
    public_url = f"/uploads/{unique_filename}"

    # Save metadata and file path to database
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Documents (Title, Author, Category, Department, Classification, Year, Sensitivity, File_Path)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        metadata['title'],
        metadata['author'],
        metadata['category'],
        metadata['department'],
        metadata['classification'],
        int(metadata['year']),
        metadata['sensitivity'],
        public_url
    ))
    conn.commit()
    document_id = cursor.lastrowid
    cursor.close()
    conn.close()

    return jsonify({'message': 'Document uploaded successfully', 'documentId': document_id}), 201

# Serve uploaded PDF file
@documents_bp.route('/uploads/<filename>')
def serve_uploaded_file(filename):
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(
        upload_folder,
        filename,
        mimetype='application/pdf',
        as_attachment=False  # 👈 this is key
    )

# API endpoint to change the file (PDF) of a document
@documents_bp.route('/upload/edit/<int:doc_id>', methods=['PUT'])
def update_document_file(doc_id):
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed. Only PDF supported.'}), 400

    filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4()}_{filename}"
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)
    save_path = os.path.join(upload_folder, unique_filename)
    file.save(save_path)

    public_url = f"/uploads/{unique_filename}"

    # Update the file path in the database
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE Documents SET File_Path = %s WHERE Document_ID = %s",
        (public_url, doc_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'message': 'Document file updated', 'filePath': public_url})
