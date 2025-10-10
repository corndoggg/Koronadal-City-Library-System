import os
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()


def _get_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in ('true', '1', 'yes', 'on')


def _get_int(name: str, default: int | None = None) -> int | None:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default

class Config:
    DB_CONFIG = {
        'host': os.getenv('DB_HOST'),
    'port': _get_int('DB_PORT', 3306),
        'user': os.getenv('DB_USER'),
        'password': os.getenv('DB_PASSWORD'),
        'database': os.getenv('DB_NAME'),
    }
    CORS_ORIGINS = [
        "https://koronadal-library.site",
        "https://api.koronadal-library.site",
        "http://localhost:5000",
        "http://localhost:5173"
    ]
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', os.path.join(os.getcwd(), 'uploads'))

    # Email / SMTP (Flask-Mail)
    MAIL_SERVER = os.getenv('MAIL_SERVER', '')
    MAIL_PORT = _get_int('MAIL_PORT', 587)
    MAIL_USE_TLS = _get_bool('MAIL_USE_TLS', True)
    MAIL_USE_SSL = _get_bool('MAIL_USE_SSL', False)
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER')
    MAIL_SUPPRESS_SEND = _get_bool('MAIL_SUPPRESS_SEND', False)
    MAIL_MAX_EMAILS = _get_int('MAIL_MAX_EMAILS')
    MAIL_ASCII_ATTACHMENTS = _get_bool('MAIL_ASCII_ATTACHMENTS', False)

    APP_BASE_URL = os.getenv('APP_BASE_URL', 'http://localhost:5173')