from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import os

app = Flask(__name__)
CORS(app,origins=["https://koronadal-library.site"])

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', '31.97.106.60'), 
    'port': int(os.getenv('DB_PORT', 5432)),
    'user': os.getenv('DB_USER', 'admin'),
    'password': os.getenv('DB_PASSWORD', 'password'),
    'database': os.getenv('DB_NAME', 'kcls_db')
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"Error connecting to MariaDB: {e}")
        return None

# Get all books with inventory
@app.route('/api/books', methods=['GET'])
def get_books():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM Books")
    books = cursor.fetchall()

    for book in books:
        cursor.execute("SELECT AccessionNumber, Availability, PhysicalStatus, BookCondition, BookLocation FROM Book_Inventory WHERE Book_ID = %s", (book['Book_ID'],))
        inventory = cursor.fetchall()
        book['inventory'] = [
            {
                'accessionNumber': i['AccessionNumber'],
                'availability': i['Availability'],
                'physicalStatus': i['PhysicalStatus']
                'condition': i['BookCondition'],
                'location': i['BookLocation']
            } for i in inventory
        ]

    cursor.close()
    conn.close()

    return jsonify(books)

# Add a book with inventory entries
@app.route('/api/books', methods=['POST'])
def add_book():
    data = request.json
    book = data

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO Books (Title, Author, Edition, Publisher, Year, Subject, Language, ISBN)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (book['title'], book['author'], book['edition'], book['publisher'], book['year'], book['subject'], book['language'], book['isbn']))
        book_id = cursor.lastrowid

        for copy in book.get('inventory', []):
            cursor.execute("""
                INSERT INTO Book_Inventory (Book_ID, Accession_Number, Availability, Physical_Status, BookCondition, BookLocation)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (book_id, copy['accessionNumber'], copy['availability'], copy['physicalStatus'], copy['condition'], copy['location']))

        conn.commit()
        return jsonify({'message': 'Book added successfully', 'book_id': book_id})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# Update book and inventory
@app.route('/api/books/<int:book_id>', methods=['PUT'])
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
        """, (data['title'], data['author'], data['edition'], data['publisher'], data['year'], data['subject'], data['language'], data['isbn'], book_id))

        cursor.execute("DELETE FROM Book_Inventory WHERE Book_ID = %s", (book_id,))
        for copy in data.get('inventory', []):
            cursor.execute("""
                INSERT INTO Book_Inventory (Book_ID, AccessionNumber, Availability, PhysicalStatus, BookCondition, BookLocation)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (book_id, copy['accessionNumber'], copy['availability'], 'Good', copy['condition'], copy['location']))

        conn.commit()
        return jsonify({'message': 'Book updated successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
