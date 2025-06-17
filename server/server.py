from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend API calls

# Sample route
@app.route('/api/hello', methods=['GET'])
def hello():
    return jsonify({"message": "Hello from Flask API!"})

# More routes here...

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)