import os, re
from flask import Flask, jsonify, send_from_directory, request, make_response
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from dotenv import load_dotenv

from flask_login import current_user

from config import Config
from extensions import db, migrate, login_manager, limiter
from models import User, ListingImage, Listing
from routes import register_blueprints

load_dotenv()

# Sentry error tracking (init early to catch everything)
_sentry_dsn = os.getenv("SENTRY_DSN", "")
if _sentry_dsn:
    import sentry_sdk
    sentry_sdk.init(dsn=_sentry_dsn, traces_sample_rate=0.1, profiles_sample_rate=0.1)

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

    # Server-side sessions (Redis when available, PostgreSQL fallback)
    redis_url = app.config.get("REDIS_URL")
    if redis_url:
        import redis
        app.config["SESSION_REDIS"] = redis.from_url(redis_url)
    else:
        app.config["SESSION_SQLALCHEMY"] = db
    from flask_session import Session
    Session(app)

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
        changed |= _add_col("listings", "is_demo", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("messages", "image_url", "TEXT")
        changed |= _add_col("users", "last_seen", "TIMESTAMP WITH TIME ZONE")
        changed |= _add_col("listings", "nudged_at", "TIMESTAMP WITH TIME ZONE")
        changed |= _add_col("users", "pro_free_boost_last_used_day", "VARCHAR(10)")
        changed |= _add_col("boosts", "boost_type", "VARCHAR(16) DEFAULT 'paid'")
        changed |= _add_col("boosts", "duration_hours", "INTEGER DEFAULT 24")
        changed |= _add_col("listing_images", "image_data", "BYTEA")
        changed |= _add_col("listing_images", "image_mime", "VARCHAR(32)")
        changed |= _add_col("reports", "listing_id", "VARCHAR(36) REFERENCES listings(id)")
        changed |= _add_col("users", "is_test_account", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("users", "is_admin", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("users", "is_banned", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("reports", "admin_notes", "TEXT")
        changed |= _add_col("reports", "resolved_by", "VARCHAR(36)")
        changed |= _add_col("reports", "resolved_at", "TIMESTAMP WITH TIME ZONE")
        if changed:
            db.session.commit()

        # Partial unique index: only 1 active boost per listing at the DB level
        try:
            db.session.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_boost_per_listing "
                "ON boosts (listing_id) WHERE status = 'active'"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # One-time cleanup: remove old broken images (filesystem URLs) and empty listings
        # Use raw SQL to avoid ORM issues with missing columns
        try:
            result = db.session.execute(text(
                "DELETE FROM listing_images WHERE image_url LIKE '%/uploads/%' AND image_data IS NULL"
            ))
            if result.rowcount > 0:
                # Find listings with zero remaining images and delete them + dependents
                orphans = db.session.execute(text(
                    "SELECT id FROM listings WHERE id NOT IN (SELECT DISTINCT listing_id FROM listing_images)"
                )).fetchall()
                for (lid,) in orphans:
                    # Delete dependents via raw SQL — each wrapped individually
                    for tbl, col in [
                        ("boost_impressions", "boost_id IN (SELECT id FROM boosts WHERE listing_id=:lid)"),
                        ("boosts", "listing_id=:lid"),
                        ("messages", "conversation_id IN (SELECT id FROM conversations WHERE listing_id=:lid)"),
                        ("conversations", "listing_id=:lid"),
                        ("safe_meet_locations", "listing_id=:lid"),
                        ("safety_ack_events", "listing_id=:lid"),
                        ("observing", "listing_id=:lid"),
                        ("notifications", "listing_id=:lid"),
                        ("offers", "listing_id=:lid"),
                        ("price_history", "listing_id=:lid"),
                        ("reviews", "listing_id=:lid"),
                        ("listing_views", "listing_id=:lid"),
                        ("meetup_confirmations", "listing_id=:lid"),
                    ]:
                        try:
                            db.session.execute(text(f"DELETE FROM {tbl} WHERE {col}"), {"lid": lid})
                        except Exception:
                            db.session.rollback()
                    # Also try reports (column may not exist on older DBs)
                    try:
                        db.session.execute(text("DELETE FROM reports WHERE listing_id=:lid"), {"lid": lid})
                    except Exception:
                        db.session.rollback()
                    try:
                        db.session.execute(text("DELETE FROM listings WHERE id=:lid"), {"lid": lid})
                    except Exception:
                        db.session.rollback()
                db.session.commit()
        except Exception:
            db.session.rollback()

        # Bootstrap admin: promote ADMIN_EMAIL user to is_admin on startup
        admin_email = os.getenv("ADMIN_EMAIL", "").strip().lower()
        if admin_email:
            admin_user = User.query.filter_by(email=admin_email).first()
            if not admin_user:
                admin_user = User.query.filter(User.email.ilike(admin_email)).first()
            if admin_user and not admin_user.is_admin:
                admin_user.is_admin = True
                db.session.commit()

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, user_id)

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "Login required"}), 401

    register_blueprints(app)

    # Block write operations for test accounts (Stripe review)
    @app.before_request
    def _block_test_account_writes():
        if not current_user.is_authenticated:
            return
        if not getattr(current_user, "is_test_account", False):
            return
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return
        # Allow login/logout/me
        path = request.path
        if path in ("/api/auth/login", "/api/auth/logout", "/api/auth/me"):
            return
        return jsonify({"error": "This is a read-only review account"}), 403

    @app.before_request
    def _block_banned_users():
        if not current_user.is_authenticated:
            return
        if not getattr(current_user, "is_banned", False):
            return
        path = request.path
        if path in ("/api/auth/logout", "/api/auth/me"):
            return
        return jsonify({"error": "Your account has been suspended"}), 403

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True}), 200

    @app.post("/api/admin/promote")
    def promote_admin():
        secret = request.headers.get("X-Cron-Secret") or request.args.get("secret")
        if secret != app.config["CRON_SECRET"]:
            return jsonify({"error": "Forbidden"}), 403
        data = request.get_json(force=True)
        email = (data.get("email") or "").strip().lower()
        u = User.query.filter_by(email=email).first()
        if not u:
            # Try case-insensitive search
            u = User.query.filter(User.email.ilike(email)).first()
        if not u:
            return jsonify({"error": "User not found", "searched": email}), 404
        u.is_admin = True
        db.session.commit()
        return jsonify({"ok": True, "email": u.email, "is_admin": True}), 200

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

    @app.post("/api/admin/seed-demo")
    def seed_demo():
        import urllib.request
        secret = request.headers.get("X-Cron-Secret") or request.args.get("secret")
        if secret != app.config["CRON_SECRET"]:
            return jsonify({"error": "Forbidden"}), 403

        # Get or create a demo seller account
        demo_email = "demo@pocket-market.com"
        demo_user = User.query.filter_by(email=demo_email).first()
        if not demo_user:
            demo_user = User(
                email=demo_email,
                display_name="Demo Seller",
                is_verified=True,
            )
            demo_user.set_password("demo-not-a-real-account")
            db.session.add(demo_user)
            db.session.flush()

        demos = [
            {
                "title": "Vintage Bluetooth Speaker (Demo)",
                "description": "This is a demo listing created for pre-launch review purposes. Pocket Market is a peer-to-peer marketplace where items are listed and sold by individual users, not by Pocket Market.",
                "price_cents": 4500,
                "category": "Electronics",
                "condition": "Like New",
                "city": "Los Angeles",
                "pickup_or_shipping": "pickup",
                "image_url": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80",
            },
            {
                "title": "Mountain Bike - 21 Speed (Demo)",
                "description": "This is a demo listing created for pre-launch review purposes. Pocket Market is a peer-to-peer marketplace where items are listed and sold by individual users, not by Pocket Market.",
                "price_cents": 12000,
                "category": "Sports",
                "condition": "Good",
                "city": "Los Angeles",
                "pickup_or_shipping": "pickup",
                "image_url": "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=600&q=80",
            },
        ]

        created = []
        for d in demos:
            image_url = d.pop("image_url")
            # Check if this demo listing already exists
            existing = Listing.query.filter_by(title=d["title"], is_demo=True).first()
            if existing:
                # Add image if missing
                has_img = ListingImage.query.filter_by(listing_id=existing.id).first()
                if not has_img:
                    try:
                        img_data = urllib.request.urlopen(image_url, timeout=15).read()
                        img_record = ListingImage(
                            listing_id=existing.id,
                            image_url="",
                            image_data=img_data,
                            image_mime="image/jpeg",
                        )
                        db.session.add(img_record)
                        db.session.flush()
                        img_record.image_url = f"/api/listings/image/{img_record.id}"
                        created.append(f"{existing.title} (image added)")
                    except Exception as e:
                        created.append(f"{existing.title} (image failed: {e})")
                else:
                    created.append(f"{existing.title} (already has image)")
                continue

            listing = Listing(user_id=demo_user.id, is_demo=True, **d)
            db.session.add(listing)
            db.session.flush()

            # Download and attach image
            try:
                img_data = urllib.request.urlopen(image_url, timeout=15).read()
                img_record = ListingImage(
                    listing_id=listing.id,
                    image_url="",
                    image_data=img_data,
                    image_mime="image/jpeg",
                )
                db.session.add(img_record)
                db.session.flush()
                img_record.image_url = f"/api/listings/image/{img_record.id}"
            except Exception:
                pass
            created.append(d["title"])

        db.session.commit()
        return jsonify({"ok": True, "created": created}), 201

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
