from flask import Blueprint, request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from extensions import db
from models import User

auth_bp = Blueprint("auth", __name__)

def _serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt=current_app.config["RESET_TOKEN_SALT"])

@auth_bp.get("/me")
def me():
    if not current_user.is_authenticated:
        return jsonify({"authenticated": False}), 200
    return jsonify({
        "authenticated": True,
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "display_name": current_user.display_name,
            "is_pro": current_user.is_pro,
            "avatar_url": current_user.avatar_url
        }
    }), 200

@auth_bp.post("/signup")
def signup():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    display_name = (data.get("display_name") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    u = User(email=email, display_name=display_name or None)
    u.set_password(password)
    db.session.add(u)
    db.session.commit()

    login_user(u)
    return jsonify({"ok": True, "user": {"id": u.id, "email": u.email, "display_name": u.display_name}}), 201

@auth_bp.post("/login")
def login():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    u = User.query.filter_by(email=email).first()
    if not u or not u.password_hash or not u.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    login_user(u)
    return jsonify({"ok": True, "user": {"id": u.id, "email": u.email, "display_name": u.display_name, "is_pro": u.is_pro}}), 200

@auth_bp.post("/logout")
@login_required
def logout():
    logout_user()
    return jsonify({"ok": True}), 200

@auth_bp.post("/forgot")
def forgot():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()

    u = User.query.filter_by(email=email).first()
    if not u:
        return jsonify({"ok": True}), 200

    token = _serializer().dumps({"user_id": u.id})
    return jsonify({"ok": True, "reset_token": token}), 200

@auth_bp.post("/reset")
def reset():
    data = request.get_json(force=True)
    token = data.get("token") or ""
    new_password = data.get("new_password") or ""

    if not token or not new_password:
        return jsonify({"error": "Token and new_password required"}), 400

    try:
        payload = _serializer().loads(
            token,
            max_age=current_app.config["RESET_TOKEN_EXPIRES_SECONDS"]
        )
    except SignatureExpired:
        return jsonify({"error": "Token expired"}), 400
    except BadSignature:
        return jsonify({"error": "Invalid token"}), 400

    u = db.session.get(User, payload["user_id"])
    if not u:
        return jsonify({"error": "User not found"}), 404

    u.set_password(new_password)
    db.session.commit()
    return jsonify({"ok": True}), 200
