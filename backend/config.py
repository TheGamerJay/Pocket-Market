import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")

    # Railway provides DATABASE_URL
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///local.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    RESET_TOKEN_SALT = os.getenv("RESET_TOKEN_SALT", "minimarket-reset")
    RESET_TOKEN_EXPIRES_SECONDS = int(os.getenv("RESET_TOKEN_EXPIRES_SECONDS", "3600"))

    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH_MB = int(os.getenv("MAX_CONTENT_LENGTH_MB", "10"))

    # Session cookie settings for HTTPS (Railway)
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = os.getenv("RAILWAY_ENVIRONMENT", "") != ""
