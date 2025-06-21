from flask import Blueprint, jsonify, request
from ..db import get_db_connection

books_bp = Blueprint('books', __name__)

@books_bp.route('/books', methods=['GET'])
def get_books():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Books")
    books = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(books)

@books_bp.route('/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Books WHERE Book_ID = %s", (book_id,))
    book = cursor.fetchone()

    if book:
        cursor.execute("""
            SELECT ID, Accession_Number, Availability, Physical_Status, BookCondition, BookLocation
            FROM Book_Inventory WHERE Book_ID = %s
        """, (book_id,))
        book['inventory'] = cursor.fetchall()

    cursor.close()
    conn.close()
    return jsonify(book) if book else (jsonify({'error': 'Book not found'}), 404)

@books_bp.route('/books', methods=['POST'])
def add_book():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Books (Title, Author, Edition, Publisher, Year, Subject, Language, ISBN)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (data['title'], data['author'], data['edition'], data['publisher'],
          data['year'], data['subject'], data['language'], data['isbn']))
    conn.commit()
    book_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return jsonify({'message': 'Book added', 'book_id': book_id})

@books_bp.route('/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE Books SET Title=%s, Author=%s, Edition=%s, Publisher=%s, Year=%s,
        Subject=%s, Language=%s, ISBN=%s WHERE Book_ID=%s
    """, (data['title'], data['author'], data['edition'], data['publisher'],
          data['year'], data['subject'], data['language'], data['isbn'], book_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Book updated'})