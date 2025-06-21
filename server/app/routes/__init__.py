from flask import Blueprint
from .books import books_bp

def register_routes(app):
    app.register_blueprint(books_bp, url_prefix='/api')
