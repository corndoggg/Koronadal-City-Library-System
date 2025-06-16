#!/bin/bash

# Start nginx in the background
service nginx start

# Start the Flask server
cd /app
# You can change this to gunicorn if needed
python server.py