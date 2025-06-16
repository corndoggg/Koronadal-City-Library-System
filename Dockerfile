# Backend build stage
FROM python:3.11-slim as backend

WORKDIR /app
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server/ .

# Frontend build stage
FROM node:18 as frontend

WORKDIR /app
COPY kcls-app/ ./
RUN npm install && npm run build

# Final stage
FROM python:3.11-slim

# Install nginx
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Copy backend app
COPY --from=backend /app /app

# Copy frontend build to nginx
COPY --from=frontend /app/dist /var/www/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]