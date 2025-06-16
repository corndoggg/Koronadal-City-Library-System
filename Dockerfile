# frontend build stage
FROM node:18 as frontend
WORKDIR /app
COPY kcls-app/ ./
RUN npm install && npm run build

# backend + nginx stage
FROM python:3.11 as stage-1
WORKDIR /app

# Install nginx and curl
RUN apt-get update && apt-get install -y nginx curl && rm -rf /var/lib/apt/lists/*

# Install Flask dependencies
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY server/ .

# Copy built frontend
COPY --from=frontend /app/dist /var/www/html

# Copy nginx config and start script
COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]