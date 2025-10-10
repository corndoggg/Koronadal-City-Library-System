from flask import Flask
from .config import Config
from .cors import init_cors
from .routes import register_routes
from app.services.auto_return import start_auto_return_service
from app.services.auto_overdue import start_auto_overdue_service
from app.services.auto_backup import start_auto_backup_service
from .extensions import mail

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    mail.init_app(app)
    # Modular CORS setup
    init_cors(app, Config.CORS_ORIGINS)
    # Modular route registration
    register_routes(app)
    start_auto_return_service(app)
    start_auto_overdue_service(app)
    start_auto_backup_service(app)

    return app