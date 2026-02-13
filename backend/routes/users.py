from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from sqlalchemy import func
from extensions import db
from models import User, Listing, ListingImage, BlockedUser, Report, Conversation, Message

users_bp = Blueprint("users", __name__)


@users_bp.get("/<user_id>/profile")
@login_required
def public_profile(user_id):
    u = db.session.get(User, user_id)
    if not u:
        return jsonify({"error": "User not found"}), 404

    listings = Listing.query.filter_by(user_id=user_id).order_by(Listing.created_at.desc()).all()
    sold_count = sum(1 for l in listings if l.is_sold)

    # Calculate average response time
    avg_response_minutes = None
    try:
        seller_convs = Conversation.query.filter_by(seller_id=user_id).all()
        response_times = []
        for conv in seller_convs[:20]:  # limit to recent 20
            msgs = Message.query.filter_by(conversation_id=conv.id).order_by(Message.created_at.asc()).limit(5).all()
            buyer_msg = None
            for m in msgs:
                if m.sender_id != user_id and buyer_msg is None:
                    buyer_msg = m
                elif m.sender_id == user_id and buyer_msg is not None:
                    diff = (m.created_at - buyer_msg.created_at).total_seconds() / 60
                    if diff > 0:
                        response_times.append(diff)
                    break
        if response_times:
            avg_response_minutes = round(sum(response_times) / len(response_times))
    except:
        pass

    listing_dicts = []
    for l in listings:
        img = ListingImage.query.filter_by(listing_id=l.id).order_by(ListingImage.created_at.asc()).first()
        listing_dicts.append({
            "id": l.id,
            "title": l.title,
            "price_cents": l.price_cents,
            "is_sold": l.is_sold,
            "image": img.image_url if img else None,
            "created_at": l.created_at.isoformat(),
        })

    is_blocked = False
    if current_user.is_authenticated:
        is_blocked = BlockedUser.query.filter_by(blocker_id=current_user.id, blocked_id=user_id).first() is not None

    return jsonify({
        "profile": {
            "id": u.id,
            "display_name": u.display_name or "User",
            "avatar_url": u.avatar_url,
            "is_pro": u.is_pro,
            "is_verified": u.is_verified,
            "member_since": u.created_at.isoformat(),
            "listings_count": len(listings),
            "sold_count": sold_count,
            "avg_response_minutes": avg_response_minutes,
            "is_blocked": is_blocked,
        },
        "listings": listing_dicts,
    }), 200


@users_bp.post("/<user_id>/block")
@login_required
def toggle_block(user_id):
    if user_id == current_user.id:
        return jsonify({"error": "Can't block yourself"}), 400

    u = db.session.get(User, user_id)
    if not u:
        return jsonify({"error": "User not found"}), 404

    existing = BlockedUser.query.filter_by(blocker_id=current_user.id, blocked_id=user_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({"ok": True, "blocked": False}), 200
    else:
        db.session.add(BlockedUser(blocker_id=current_user.id, blocked_id=user_id))
        db.session.commit()
        return jsonify({"ok": True, "blocked": True}), 200


@users_bp.post("/<user_id>/report")
@login_required
def report_user(user_id):
    if user_id == current_user.id:
        return jsonify({"error": "Can't report yourself"}), 400

    data = request.get_json(force=True)
    reason = (data.get("reason") or "").strip()
    listing_id = data.get("listing_id")

    if not reason:
        return jsonify({"error": "Reason required"}), 400

    r = Report(
        reporter_id=current_user.id,
        reported_user_id=user_id,
        listing_id=listing_id,
        reason=reason,
    )
    db.session.add(r)
    db.session.commit()
    return jsonify({"ok": True}), 201
