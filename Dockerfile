# Stage 1: Frontend build
FROM node:18 as frontend
WORKDIR /app
COPY kcls-app/ ./
RUN npm install && npm run build

# Stage 2: Final stage with backend and nginx
FROM python:3.11-slim

# Install nginx
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend and install dependencies
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server/ .

# Copy built frontend
COPY --from=frontend /app/dist /var/www/html

# Copy configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]