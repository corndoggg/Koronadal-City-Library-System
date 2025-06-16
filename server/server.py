from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='static', static_url_path='/')
CORS(app)  # Enable CORS for API calls

# Example API route
@app.route('/api/hello', methods=['GET'])
def hello():
    return jsonify(message="Hello from Flask API!")

# Serve React static files
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# Entry point
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
