from flask_cors import CORS

def init_cors(app, origins):
    CORS(
        app,
        origins=origins,
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )
