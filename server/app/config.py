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
        "https://5173-firebase-kcls-app-1750170042887.cluster-w5vd22whf5gmav2vgkomwtc4go.cloudworkstations.dev",
        "http://localhost:5173"
    ]
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER')