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


# List files from the uploads directory with basic metadata
@documents_bp.route('/documents/uploads', methods=['GET'])
def list_uploaded_files():
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)

    def _parse_int(name: str, default: int) -> int:
        try:
            value = int(request.args.get(name, default))
        except (TypeError, ValueError):
            return default
        return value

    page = max(_parse_int('page', 1), 1)
    per_page = max(1, min(_parse_int('per_page', 10), 100))

    files = []
    try:
        for entry in os.scandir(upload_folder):
            if not entry.is_file():
                continue
            stat = entry.stat()
            files.append({
                'file': entry.name,
                'size': stat.st_size,
                'mtime': int(stat.st_mtime),
                'url': f"/uploads/{entry.name}"
            })
    except (FileNotFoundError, PermissionError):
        return jsonify({
            'files': [],
            'total': 0,
            'page': page,
            'per_page': per_page,
            'total_pages': 0
        })

    files.sort(key=lambda item: item['mtime'], reverse=True)

    total = len(files)
    total_pages = (total + per_page - 1) // per_page if total else 0
    if total_pages:
        if page > total_pages:
            page = total_pages
    else:
        page = 1

    start = (page - 1) * per_page
    paged_files = files[start:start + per_page]

    return jsonify({
        'files': paged_files,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': total_pages
    })


@documents_bp.route('/documents/uploads', methods=['POST'])
def upload_file_to_uploads():
    files = request.files.getlist('files')
    if not files:
        files = request.files.getlist('files[]')
    if not files:
        single = request.files.get('file')
        if single is not None:
            files = [single]
    if not files and request.files:
        files = list(request.files.values())

    valid_files = []
    for f in files:
        filename = getattr(f, 'filename', '') or ''
        if not filename:
            continue
        if not allowed_file(filename):
            return jsonify({'error': f'File type not allowed for "{filename}". Only PDF supported.'}), 400
        valid_files.append((f, filename))

    if not valid_files:
        return jsonify({'error': 'No PDF files provided.'}), 400

    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)

    saved_files = []
    for file_obj, original_name in valid_files:
        safe_name = secure_filename(original_name)
        if not safe_name:
            return jsonify({'error': f'Invalid filename for "{original_name}".'}), 400

        save_path = os.path.join(upload_folder, safe_name)

        try:
            file_obj.save(save_path)
            stat = os.stat(save_path)
        except OSError as exc:
            # Cleanup any partially saved files from this batch
            for saved in saved_files:
                try:
                    os.remove(os.path.join(upload_folder, saved['file']))
                except OSError:
                    pass
            return jsonify({'error': f'Failed to store file "{original_name}": {exc}'}), 500

        saved_files.append({
            'file': safe_name,
            'original': original_name,
            'size': stat.st_size,
            'mtime': int(stat.st_mtime),
            'url': f"/uploads/{safe_name}"
        })

    message = f"Uploaded {len(saved_files)} file{'s' if len(saved_files) != 1 else ''}."
    return jsonify({'message': message, 'files': saved_files}), 201

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
