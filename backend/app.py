import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from dotenv import load_dotenv

from config import Config
from extensions import db, migrate, login_manager
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

    # ── Serve the React frontend ──
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
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
