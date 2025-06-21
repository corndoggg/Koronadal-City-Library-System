import os
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

class Config:
    DB_CONFIG = {
        'host': os.getenv('DB_HOST', '31.97.106.60'),
        'port': int(os.getenv('DB_PORT', 5432)),
        'user': os.getenv('DB_USER', 'admin'),
        'password': os.getenv('DB_PASSWORD', 'password'),
        'database': os.getenv('DB_NAME', 'kcls_db'),
    }
    CORS_ORIGINS = [
        "https://koronadal-library.site",
        "https://5173-firebase-kcls-app-1750170042887.cluster-w5vd22whf5gmav2vgkomwtc4go.cloudworkstations.dev",
        "http://localhost:5173"
    ]
