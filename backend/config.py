import os

def _fix_db_url(url):
    # Railway gives postgres:// but SQLAlchemy 2.x requires postgresql://
    if url and url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")

    # Railway provides DATABASE_URL
    SQLALCHEMY_DATABASE_URI = _fix_db_url(os.getenv("DATABASE_URL", "sqlite:///local.db"))
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    RESET_TOKEN_SALT = os.getenv("RESET_TOKEN_SALT", "pocketmarket-reset")
    RESET_TOKEN_EXPIRES_SECONDS = int(os.getenv("RESET_TOKEN_EXPIRES_SECONDS", "3600"))

    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH_MB = int(os.getenv("MAX_CONTENT_LENGTH_MB", "10"))

    # Session cookie settings for HTTPS (Railway)
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = os.getenv("RAILWAY_ENVIRONMENT", "") != ""

    # Resend (transactional email)
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM = os.getenv("RESEND_FROM", "Pocket Market <noreply@pocket-market.com>")

    # Web Push (VAPID)
    VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
    VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
    VAPID_CLAIMS = {"sub": "mailto:pocketmarket.help@gmail.com"}

    # Cron auth
    CRON_SECRET = os.getenv("CRON_SECRET", "dev-secret-change-me")

    # Redis (Railway provides REDIS_URL)
    REDIS_URL = os.getenv("REDIS_URL", "")
    SESSION_TYPE = "redis" if os.getenv("REDIS_URL") else "filesystem"
    SESSION_PERMANENT = True
    SESSION_USE_SIGNER = True
    SESSION_KEY_PREFIX = "pm:"
    PERMANENT_SESSION_LIFETIME = 60 * 60 * 24 * 30  # 30 days

    # Sentry
    SENTRY_DSN = os.getenv("SENTRY_DSN", "")

    # Stripe
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    STRIPE_PRO_PRICE_ID = os.getenv("STRIPE_PRO_PRICE_ID", "")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
