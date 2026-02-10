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
