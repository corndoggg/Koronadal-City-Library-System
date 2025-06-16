#!/bin/bash

# Start Flask in the background
python3 server.py &

# Start Nginx in the foreground
nginx -g 'daemon off;'
