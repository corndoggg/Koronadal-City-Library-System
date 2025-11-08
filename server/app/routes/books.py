from flask import Blueprint, jsonify, request
from ..db import get_db_connection

books_bp = Blueprint('books', __name__)

@books_bp.route('/books', methods=['GET'])
def get_books():
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM Books")
        books = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()
    return jsonify(books)

@books_bp.route('/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM Books WHERE Book_ID = %s", (book_id,))
        book = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()
    return jsonify(book) if book else (jsonify({'error': 'Book not found'}), 404)
def _normalize_string(value):
    if value is None:
        return None
    trimmed = str(value).strip()
    return trimmed or None


def _normalize_year(value):
    if value in (None, ''):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


@books_bp.route('/books', methods=['POST'])
def add_book():
    data = request.get_json(silent=True) or {}

    title = _normalize_string(data.get('title'))
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    payload = (
        title,
        _normalize_string(data.get('author')),
        _normalize_string(data.get('edition')),
        _normalize_string(data.get('publisher')),
        _normalize_year(data.get('year')),
        _normalize_string(data.get('subject')),
        _normalize_string(data.get('language')),
        _normalize_string(data.get('isbn'))
    )

    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
                INSERT INTO Books (Title, Author, Edition, Publisher, Year, Subject, Language, ISBN)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            payload
        )
        conn.commit()
        book_id = cursor.lastrowid
    finally:
        cursor.close()
        conn.close()

    return jsonify({'message': 'Book added', 'book_id': book_id})

@books_bp.route('/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    data = request.get_json(silent=True) or {}

    title = _normalize_string(data.get('title'))
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    payload = (
        title,
        _normalize_string(data.get('author')),
        _normalize_string(data.get('edition')),
        _normalize_string(data.get('publisher')),
        _normalize_year(data.get('year')),
        _normalize_string(data.get('subject')),
        _normalize_string(data.get('language')),
        _normalize_string(data.get('isbn')),
        book_id
    )

    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
                UPDATE Books SET Title=%s, Author=%s, Edition=%s, Publisher=%s, Year=%s,
                Subject=%s, Language=%s, ISBN=%s WHERE Book_ID=%s
            """,
            payload
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()

    return jsonify({'message': 'Book updated'})