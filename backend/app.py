import os, re
from flask import Flask, jsonify, send_from_directory, request, make_response
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from dotenv import load_dotenv

from config import Config
from extensions import db, migrate, login_manager, limiter
from models import User
from routes import register_blueprints

load_dotenv()

STATIC_FOLDER = os.path.join(os.path.dirname(__file__), "static_frontend")

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Trust Railway's reverse proxy headers (X-Forwarded-Proto, etc.)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # max upload size
    app.config["MAX_CONTENT_LENGTH"] = app.config["MAX_CONTENT_LENGTH_MB"] * 1024 * 1024

    # CORS
    CORS(
        app,
        supports_credentials=True,
        resources={r"/api/*": {"origins": [app.config["FRONTEND_ORIGIN"]]}}
    )

    # ensure upload folder exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    limiter.init_app(app)

    with app.app_context():
        db.create_all()
        # Add columns that create_all() won't add to existing tables
        from sqlalchemy import text, inspect
        insp = inspect(db.engine)
        def _add_col(table, col, col_type):
            t_cols = {c["name"] for c in insp.get_columns(table)}
            if col not in t_cols:
                db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                return True
            return False

        changed = False
        changed |= _add_col("users", "avatar_data", "BYTEA")
        changed |= _add_col("users", "avatar_mime", "VARCHAR(32)")
        changed |= _add_col("users", "rating_avg", "NUMERIC DEFAULT 0")
        changed |= _add_col("users", "rating_count", "INTEGER DEFAULT 0")
        changed |= _add_col("users", "is_pro", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("listings", "buyer_id", "VARCHAR(36) REFERENCES users(id)")
        changed |= _add_col("users", "is_verified", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("users", "onboarding_done", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("listings", "renewed_at", "TIMESTAMP WITH TIME ZONE")
        changed |= _add_col("listings", "bundle_discount_pct", "INTEGER")
        changed |= _add_col("listings", "is_draft", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("messages", "image_url", "TEXT")
        changed |= _add_col("users", "last_seen", "TIMESTAMP WITH TIME ZONE")
        changed |= _add_col("listings", "nudged_at", "TIMESTAMP WITH TIME ZONE")
        if changed:
            db.session.commit()

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, user_id)

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "Login required"}), 401

    register_blueprints(app)

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True}), 200

    @app.get("/api/test-email")
    def test_email():
        import traceback
        try:
            from flask_login import current_user as cu
            if not cu.is_authenticated:
                return jsonify({"error": "Login required"}), 401
            from email_utils import send_email_sync
            status, result = send_email_sync(
                to=cu.email,
                subject="Pocket Market Test Email",
                body_html=f"<p>This is a test email for <b>{cu.display_name or cu.email}</b>. If you see this, email is working!</p>",
            )
            return jsonify({"ok": status < 400, "sent_to": cu.email, "status": status, "resend": result}), 200
        except Exception as e:
            return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

    # ── Serve the React frontend ──
    OG_BOTS = ["facebookexternalhit", "twitterbot", "linkedinbot", "slackbot",
               "discordbot", "whatsapp", "telegrambot", "pinterest", "redditbot", "skypeuripreview"]

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        # Open Graph for social bots on listing pages
        ua = (request.headers.get("User-Agent") or "").lower()
        is_bot = any(b in ua for b in OG_BOTS)
        listing_match = re.match(r"^listing/([a-f0-9-]+)/?$", path)

        if is_bot and listing_match:
            from models import Listing, ListingImage
            lid = listing_match.group(1)
            listing = db.session.get(Listing, lid)
            if listing:
                img = ListingImage.query.filter_by(listing_id=lid).order_by(ListingImage.created_at.asc()).first()
                img_url = f"https://pocket-market.com{img.image_url}" if img else "https://pocket-market.com/pocketmarket_favicon_transparent_512x512.png"
                price = f"${listing.price_cents / 100:.2f}"
                desc = (listing.description or listing.title or "")[:200]
                og = f"""<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta property="og:type" content="product">
<meta property="og:title" content="{listing.title} - {price}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{img_url}">
<meta property="og:url" content="https://pocket-market.com/listing/{lid}">
<meta property="og:site_name" content="Pocket Market">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{listing.title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{img_url}">
<title>{listing.title} - Pocket Market</title>
</head><body><h1>{listing.title}</h1><p>{price}</p></body></html>"""
                return make_response(og, 200, {"Content-Type": "text/html; charset=utf-8"})

        full = os.path.join(STATIC_FOLDER, path)
        if path and os.path.isfile(full):
            return send_from_directory(STATIC_FOLDER, path)
        index = os.path.join(STATIC_FOLDER, "index.html")
        if os.path.isfile(index):
            return send_from_directory(STATIC_FOLDER, "index.html")
        return jsonify({"error": "Frontend not built"}), 404

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
