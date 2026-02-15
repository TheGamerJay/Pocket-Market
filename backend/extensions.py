import os
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()

_redis_url = os.getenv("REDIS_URL", "")
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["5000 per day", "500 per hour"],
    storage_uri=_redis_url if _redis_url else "memory://",
)
