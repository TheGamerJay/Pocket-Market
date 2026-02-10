# ── Stage 1: build the React frontend ──
FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
ENV VITE_API_BASE=""
RUN npm run build

# ── Stage 2: Python backend + static files ──
FROM python:3.12-slim
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# copy the built frontend into backend/static_frontend
COPY --from=frontend-build /frontend/dist ./static_frontend

EXPOSE 5000
CMD gunicorn wsgi:app --bind 0.0.0.0:${PORT:-5000}
