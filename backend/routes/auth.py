import os
import uuid
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app, send_from_directory, Response
from flask_login import login_user, logout_user, login_required, current_user
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from extensions import db, limiter
from models import User
from email_utils import send_welcome, send_password_reset, send_verification_email

auth_bp = Blueprint("auth", __name__)

def _serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt=current_app.config["RESET_TOKEN_SALT"])

def _verify_serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="email-verify")

@auth_bp.get("/me")
def me():
    if not current_user.is_authenticated:
        return jsonify({"authenticated": False}), 200
    current_user.last_seen = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({
        "authenticated": True,
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "display_name": current_user.display_name,
            "is_pro": current_user.is_pro,
            "is_verified": current_user.is_verified,
            "avatar_url": current_user.avatar_url,
            "onboarding_done": current_user.onboarding_done,
            "is_test_account": bool(current_user.is_test_account),
        }
    }), 200

@auth_bp.post("/onboarding-done")
@login_required
def onboarding_done():
    current_user.onboarding_done = True
    db.session.commit()
    return jsonify({"ok": True}), 200

@auth_bp.post("/signup")
@limiter.limit("5 per minute")
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
    try:
        send_welcome(u.email, display_name)
    except Exception:
        pass
    try:
        token = _verify_serializer().dumps({"user_id": u.id})
        send_verification_email(u.email, display_name, token)
    except Exception:
        pass
    return jsonify({"ok": True, "user": {"id": u.id, "email": u.email, "display_name": u.display_name}}), 201

@auth_bp.post("/login")
@limiter.limit("5 per minute")
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

@auth_bp.post("/avatar")
@login_required
def upload_avatar():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f = request.files["file"]
    ext = os.path.splitext(f.filename)[1].lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
    if ext not in mime_map:
        return jsonify({"error": "Only jpg/jpeg/png/webp allowed"}), 400

    current_user.avatar_data = f.read()
    current_user.avatar_mime = mime_map[ext]
    current_user.avatar_url = f"/api/auth/avatars/{current_user.id}"
    db.session.commit()

    return jsonify({"ok": True, "avatar_url": current_user.avatar_url}), 200


@auth_bp.get("/avatars/<path:user_id>")
def serve_avatar(user_id):
    u = db.session.get(User, user_id)
    if not u or not u.avatar_data:
        return jsonify({"error": "Not found"}), 404
    return Response(u.avatar_data, mimetype=u.avatar_mime, headers={"Cache-Control": "public, max-age=3600"})


@auth_bp.post("/forgot")
@limiter.limit("3 per minute")
def forgot():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()

    u = User.query.filter_by(email=email).first()
    if not u:
        return jsonify({"ok": True}), 200

    token = _serializer().dumps({"user_id": u.id})
    try:
        send_password_reset(u.email, u.display_name, token)
    except Exception as e:
        current_app.logger.error(f"Failed to send reset email: {e}")

    return jsonify({"ok": True}), 200

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


@auth_bp.post("/send-verification")
@login_required
def send_verification():
    if current_user.is_verified:
        return jsonify({"error": "Already verified"}), 400
    token = _verify_serializer().dumps({"user_id": current_user.id})
    try:
        send_verification_email(current_user.email, current_user.display_name, token)
    except Exception as e:
        current_app.logger.error(f"Failed to send verification: {e}")
        return jsonify({"error": "Failed to send email"}), 500
    return jsonify({"ok": True}), 200


@auth_bp.get("/verify")
def verify_email():
    token = request.args.get("token", "")
    if not token:
        return jsonify({"error": "Token required"}), 400
    try:
        payload = _verify_serializer().loads(token, max_age=86400 * 7)
    except SignatureExpired:
        return jsonify({"error": "Verification link expired"}), 400
    except BadSignature:
        return jsonify({"error": "Invalid verification link"}), 400
    u = db.session.get(User, payload["user_id"])
    if not u:
        return jsonify({"error": "User not found"}), 404
    u.is_verified = True
    db.session.commit()
    return jsonify({"ok": True, "message": "Email verified!"}), 200
