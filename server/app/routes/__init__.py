from .books import books_bp
from .book_inventory import inventory_bp
from .documents import documents_bp
from .document_inventory import document_inventory_bp
from .storages import storages_bp
from .users import users_bp
from .borrowreturn import borrowreturn_bp

def register_routes(app):
    app.register_blueprint(books_bp, url_prefix='/api')
    app.register_blueprint(inventory_bp, url_prefix='/api')
    app.register_blueprint(documents_bp, url_prefix='/api')
    app.register_blueprint(document_inventory_bp, url_prefix='/api')
    app.register_blueprint(storages_bp, url_prefix='/api')
    app.register_blueprint(users_bp, url_prefix='/api')
    app.register_blueprint(borrowreturn_bp, url_prefix='/api')
