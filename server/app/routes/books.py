from flask import Blueprint, jsonify, request
from ..db import get_db_connection

books_bp = Blueprint('books', __name__)

@books_bp.route('/books', methods=['GET'])
def get_books():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Books")
    books = cursor.fetchall()

    for book in books:
        cursor.execute("""
            SELECT Accession_Number, Availability, Physical_Status, BookCondition, BookLocation 
            FROM Book_Inventory WHERE Book_ID = %s
        """, (book['Book_ID'],))
        inventory = cursor.fetchall()
        book['inventory'] = [
            {
                'accessionNumber': i['Accession_Number'],
                'availability': i['Availability'],
                'physicalStatus': i['Physical_Status'],
                'condition': i['BookCondition'],
                'location': i['BookLocation']
            } for i in inventory
        ]

    cursor.close()
    conn.close()
    return jsonify(books)


@books_bp.route('/books', methods=['POST'])
def add_book():
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO Books (Title, Author, Edition, Publisher, Year, Subject, Language, ISBN)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (data['title'], data['author'], data['edition'], data['publisher'],
              data['year'], data['subject'], data['language'], data['isbn']))
        book_id = cursor.lastrowid

        for copy in data.get('inventory', []):
            cursor.execute("""
                INSERT INTO Book_Inventory (Book_ID, Accession_Number, Availability, Physical_Status, BookCondition, BookLocation)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (book_id, copy['accessionNumber'], copy['availability'],
                  copy['physicalStatus'], copy['condition'], copy['location']))

        conn.commit()
        return jsonify({'message': 'Book added successfully', 'book_id': book_id})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


@books_bp.route('/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE Books SET Title=%s, Author=%s, Edition=%s, Publisher=%s, Year=%s, Subject=%s, Language=%s, ISBN=%s
            WHERE Book_ID=%s
        """, (data['title'], data['author'], data['edition'], data['publisher'],
              data['year'], data['subject'], data['language'], data['isbn'], book_id))

        cursor.execute("DELETE FROM Book_Inventory WHERE Book_ID = %s", (book_id,))
        for copy in data.get('inventory', []):
            cursor.execute("""
                INSERT INTO Book_Inventory (Book_ID, Accession_Number, Availability, Physical_Status, BookCondition, BookLocation)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (book_id, copy['accessionNumber'], copy['availability'],
                  copy['physicalStatus'], copy['condition'], copy['location']))

        conn.commit()
        return jsonify({'message': 'Book updated successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()