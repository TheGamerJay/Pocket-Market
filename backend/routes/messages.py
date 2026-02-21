import os, uuid
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user

from extensions import db, limiter
from models import Conversation, Message, Listing, User, ListingImage

from content_filter import check_message_content

messages_bp = Blueprint("messages", __name__)


def _notify_recipient(conversation, sender_name, body):
    """Send email + push notification to the other party if they're offline."""
    recipient_id = conversation.seller_id if conversation.buyer_id == current_user.id else conversation.buyer_id
    recipient = db.session.get(User, recipient_id)
    if not recipient:
        return

    listing = db.session.get(Listing, conversation.listing_id)
    listing_title = listing.title if listing else "item"

    # Email if offline 5+ minutes
    if not recipient.last_seen or datetime.now(timezone.utc) - recipient.last_seen > timedelta(minutes=5):
        try:
            from email_utils import send_message_notification
            send_message_notification(recipient.email, recipient.display_name, sender_name, listing_title, conversation.id)
        except Exception:
            pass

    # Push notification
    try:
        from push_utils import send_push_to_user
        send_push_to_user(recipient_id, f"Message from {sender_name}", body[:100], url=f"/chat/{conversation.id}", tag=f"msg_{conversation.id}")
    except Exception:
        pass


@messages_bp.post("/start")
@login_required
def start_conversation():
    data = request.get_json(force=True)
    listing_id = data.get("listing_id")
    seller_id = data.get("seller_id")

    if not listing_id or not seller_id:
        return jsonify({"error": "listing_id and seller_id required"}), 400

    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Listing not found"}), 404

    buyer_id = current_user.id
    if buyer_id == seller_id:
        return jsonify({"error": "Cannot message yourself"}), 400

    conv = Conversation.query.filter_by(listing_id=listing_id, buyer_id=buyer_id, seller_id=seller_id).first()
    if not conv:
        conv = Conversation(listing_id=listing_id, buyer_id=buyer_id, seller_id=seller_id)
        db.session.add(conv)
        db.session.commit()

    return jsonify({"ok": True, "conversation_id": conv.id}), 200

@messages_bp.get("/conversations")
@login_required
def my_conversations():
    uid = current_user.id
    rows = Conversation.query.filter(
        (Conversation.buyer_id == uid) | (Conversation.seller_id == uid)
    ).order_by(Conversation.created_at.desc()).all()

    result = []
    for c in rows:
        other_id = c.seller_id if c.buyer_id == uid else c.buyer_id
        other_user = db.session.get(User, other_id)
        listing = db.session.get(Listing, c.listing_id)
        last_msg = Message.query.filter_by(conversation_id=c.id).order_by(Message.created_at.desc()).first()
        first_img = ListingImage.query.filter_by(listing_id=c.listing_id).order_by(ListingImage.created_at.asc()).first()

        result.append({
            "id": c.id,
            "listing_id": c.listing_id,
            "listing_title": listing.title if listing else "Deleted",
            "listing_image": first_img.image_url if first_img else None,
            "other_user_name": other_user.display_name or "User" if other_user else "User",
            "other_user_avatar": other_user.avatar_url if other_user else None,
            "last_message": last_msg.body if last_msg else None,
            "last_message_at": last_msg.created_at.isoformat() if last_msg else c.created_at.isoformat(),
            "buyer_id": c.buyer_id,
            "seller_id": c.seller_id,
            "created_at": c.created_at.isoformat()
        })

    return jsonify({"conversations": result}), 200

@messages_bp.get("/<conversation_id>")
@login_required
def get_messages(conversation_id):
    c = db.session.get(Conversation, conversation_id)
    if not c:
        return jsonify({"error": "Not found"}), 404
    if current_user.id not in [c.buyer_id, c.seller_id]:
        return jsonify({"error": "Forbidden"}), 403

    other_id = c.seller_id if c.buyer_id == current_user.id else c.buyer_id
    other_user = db.session.get(User, other_id)
    listing = db.session.get(Listing, c.listing_id)

    msgs = Message.query.filter_by(conversation_id=conversation_id).order_by(Message.created_at.asc()).all()
    return jsonify({
        "listing_title": listing.title if listing else "Deleted",
        "other_user_name": other_user.display_name or "User" if other_user else "User",
        "messages": [{
            "id": m.id,
            "sender_id": m.sender_id,
            "body": m.body,
            "image_url": m.image_url,
            "created_at": m.created_at.isoformat()
        } for m in msgs]
    }), 200

@messages_bp.post("/<conversation_id>")
@login_required
@limiter.limit("30 per minute")
def send_message(conversation_id):
    c = db.session.get(Conversation, conversation_id)
    if not c:
        return jsonify({"error": "Not found"}), 404
    if current_user.id not in [c.buyer_id, c.seller_id]:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(force=True)
    body = (data.get("body") or "").strip()
    if not body:
        return jsonify({"error": "Message body required"}), 400

    moderation = check_message_content(body)
    if moderation:
        return jsonify({"error": moderation["reason"]}), 422

    m = Message(conversation_id=conversation_id, sender_id=current_user.id, body=body)
    db.session.add(m)
    db.session.commit()

    _notify_recipient(c, current_user.display_name or current_user.email, body)

    return jsonify({"ok": True, "message_id": m.id}), 201


@messages_bp.post("/<conversation_id>/image")
@login_required
@limiter.limit("30 per minute")
def send_chat_image(conversation_id):
    c = db.session.get(Conversation, conversation_id)
    if not c:
        return jsonify({"error": "Not found"}), 404
    if current_user.id not in [c.buyer_id, c.seller_id]:
        return jsonify({"error": "Forbidden"}), 403

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f = request.files["file"]
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        return jsonify({"error": "Only jpg/jpeg/png/webp allowed"}), 400

    folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(folder, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(folder, name)
    f.save(path)

    from image_utils import compress_image
    compress_image(path)

    url = f"/api/listings/uploads/{name}"

    m = Message(conversation_id=conversation_id, sender_id=current_user.id, body="[Image]", image_url=url)
    db.session.add(m)
    db.session.commit()

    _notify_recipient(c, current_user.display_name or current_user.email, "[Image]")

    return jsonify({"ok": True, "message_id": m.id, "image_url": url}), 201
