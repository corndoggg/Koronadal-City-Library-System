import os
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

class Config:
    DB_CONFIG = {
        'host': os.getenv('DB_HOST'),
        'port': int(os.getenv('DB_PORT')),
        'user': os.getenv('DB_USER'),
        'password': os.getenv('DB_PASSWORD'),
        'database': os.getenv('DB_NAME'),
    }
    CORS_ORIGINS = [
        "https://koronadal-library.site",
        "https://api.koronadal-library.site",
        "http://localhost:5173"
    ]
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', os.path.join(os.getcwd(), 'uploads'))