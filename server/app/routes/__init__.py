from flask import Blueprint
from .books import books_bp
from .inventory import inventory_bp

def register_routes(app):
    app.register_blueprint(books_bp, url_prefix='/api')
    app.register_blueprint(inventory_bp, url_prefix='/api')
