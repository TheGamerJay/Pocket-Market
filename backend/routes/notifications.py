from flask import Blueprint, jsonify
from flask_login import login_required, current_user

from extensions import db
from models import Notification

notifications_bp = Blueprint("notifications", __name__)

@notifications_bp.get("")
@login_required
def get_notifications():
    rows = Notification.query.filter_by(user_id=current_user.id)\
        .order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify({"notifications": [{
        "id": n.id,
        "listing_id": n.listing_id,
        "message": n.message,
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat(),
    } for n in rows]}), 200

@notifications_bp.get("/unread-count")
@login_required
def unread_count():
    count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()
    return jsonify({"count": count}), 200

@notifications_bp.post("/mark-read")
@login_required
def mark_all_read():
    Notification.query.filter_by(user_id=current_user.id, is_read=False)\
        .update({"is_read": True})
    db.session.commit()
    return jsonify({"ok": True}), 200
