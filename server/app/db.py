import mysql.connector
from mysql.connector import Error
from .config import Config

def get_db_connection():
    try:
        conn = mysql.connector.connect(**Config.DB_CONFIG)
        if conn.is_connected():
            print("✅ Successfully connected to the MariaDB database.")
        return conn
    except Error as e:
        print(f"❌ Error connecting to MariaDB: {e}")
        return None
