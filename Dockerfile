# --- Build Frontend ---
FROM node:20 AS frontend
WORKDIR /app
COPY kcls-app ./kcls-app
WORKDIR /app/kcls-app
RUN npm install
RUN npm run build

# --- Backend with Flask ---
FROM python:3.11 AS backend
WORKDIR /app

# Install dependencies
COPY server/requirements.txt ./server/requirements.txt
RUN pip install -r ./server/requirements.txt

# Copy backend code
COPY server ./server

# Copy built frontend
COPY --from=frontend /app/kcls-app/dist ./server/static

# Expose and run Flask
WORKDIR /app/server
ENV FLASK_APP=server.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_ENV=production
EXPOSE 5000
CMD ["flask", "run", "--host=0.0.0.0"]
