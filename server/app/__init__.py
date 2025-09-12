from flask import Flask
from .config import Config
from .cors import init_cors
from .routes import register_routes
from app.services.auto_return import start_auto_return_service

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    # Modular CORS setup
    init_cors(app, Config.CORS_ORIGINS)
    # Modular route registration
    register_routes(app)
    start_auto_return_service(app, interval_seconds=60)

    return app