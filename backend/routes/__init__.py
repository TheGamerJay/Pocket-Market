from .auth import auth_bp
from .listings import listings_bp
from .observing import observing_bp
from .messages import messages_bp
from .safety import safety_bp
from .boosts import boosts_bp
from .billing import billing_bp
from .ads import ads_bp
from .oauth import oauth_bp, init_oauth

def register_blueprints(app):
    init_oauth(app)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(listings_bp, url_prefix="/api/listings")
    app.register_blueprint(observing_bp, url_prefix="/api/observing")
    app.register_blueprint(messages_bp, url_prefix="/api/messages")
    app.register_blueprint(safety_bp, url_prefix="/api/safety")
    app.register_blueprint(boosts_bp, url_prefix="/api/boosts")
    app.register_blueprint(billing_bp, url_prefix="/api/billing")
    app.register_blueprint(ads_bp, url_prefix="/api/ads")
    app.register_blueprint(oauth_bp, url_prefix="/api/auth")
