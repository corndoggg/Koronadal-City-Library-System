# Build frontend
FROM node:18 as frontend
WORKDIR /app
COPY kcls-app/ ./
RUN npm install && npm run build

# Final image
FROM python:3.11-slim

# Install Nginx and curl
RUN apt-get update && apt-get install -y nginx curl && rm -rf /var/lib/apt/lists/*

# Set working dir
WORKDIR /app

# Install Python dependencies
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Flask app
COPY server/ .

# Copy frontend build output
COPY --from=frontend /app/dist /var/www/html

# Copy Nginx config and start script
COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]