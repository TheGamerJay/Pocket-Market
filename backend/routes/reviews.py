from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from sqlalchemy import func
from extensions import db
from models import Review, Listing, User, Notification

reviews_bp = Blueprint("reviews", __name__)


@reviews_bp.post("")
@login_required
def create_review():
    data = request.get_json(force=True)
    listing_id = data.get("listing_id")
    is_positive = data.get("is_positive")
    comment = (data.get("comment") or "").strip() or None

    if is_positive is None:
        return jsonify({"error": "is_positive required"}), 400

    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Listing not found"}), 404
    if l.user_id == current_user.id:
        return jsonify({"error": "Can't review yourself"}), 400
    if not l.is_sold:
        return jsonify({"error": "Can only review sold items"}), 400
    if l.buyer_id != current_user.id:
        return jsonify({"error": "Only the buyer can leave a review"}), 403

    existing = Review.query.filter_by(reviewer_id=current_user.id, listing_id=listing_id).first()
    if existing:
        return jsonify({"error": "Already reviewed this listing"}), 409

    review = Review(
        reviewer_id=current_user.id,
        seller_id=l.user_id,
        listing_id=listing_id,
        is_positive=bool(is_positive),
        comment=comment,
    )
    db.session.add(review)

    # Update seller's rating
    seller = db.session.get(User, l.user_id)
    if seller:
        total_positive = db.session.query(func.count(Review.id)).filter(
            Review.seller_id == seller.id, Review.is_positive == True
        ).scalar()
        total_count = db.session.query(func.count(Review.id)).filter(
            Review.seller_id == seller.id
        ).scalar()
        # Include the current review (not yet committed)
        if is_positive:
            total_positive += 1
        total_count += 1
        seller.rating_count = total_count
        seller.rating_avg = round((total_positive / total_count) * 100) if total_count > 0 else 0

        # Notify seller
        reviewer_name = current_user.display_name or current_user.email
        sentiment = "positive" if is_positive else "negative"
        db.session.add(Notification(
            user_id=seller.id,
            listing_id=listing_id,
            message=f'{reviewer_name} left {sentiment} feedback on "{l.title}"',
        ))

    db.session.commit()
    return jsonify({"ok": True, "review": _review_dict(review)}), 201


@reviews_bp.get("/seller/<seller_id>")
@login_required
def seller_reviews(seller_id):
    reviews = Review.query.filter_by(seller_id=seller_id).order_by(Review.created_at.desc()).limit(50).all()
    positive = sum(1 for r in reviews if r.is_positive)
    negative = len(reviews) - positive

    return jsonify({
        "reviews": [_review_dict(r) for r in reviews],
        "summary": {
            "total": len(reviews),
            "positive": positive,
            "negative": negative,
            "score": round((positive / len(reviews)) * 100) if reviews else 0,
        }
    }), 200


@reviews_bp.get("/listing/<listing_id>/can-review")
@login_required
def can_review(listing_id):
    """Check if current user can review this listing."""
    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"can_review": False}), 200

    # Can't review own listing
    if l.user_id == current_user.id:
        return jsonify({"can_review": False}), 200

    # Must be sold
    if not l.is_sold:
        return jsonify({"can_review": False}), 200

    # Only the buyer can review
    if l.buyer_id != current_user.id:
        return jsonify({"can_review": False}), 200

    # Already reviewed
    existing = Review.query.filter_by(reviewer_id=current_user.id, listing_id=listing_id).first()
    if existing:
        return jsonify({"can_review": False, "existing_review": _review_dict(existing)}), 200

    return jsonify({"can_review": True}), 200


def _review_dict(r):
    reviewer = db.session.get(User, r.reviewer_id)
    return {
        "id": r.id,
        "reviewer_id": r.reviewer_id,
        "reviewer_name": (reviewer.display_name or reviewer.email) if reviewer else "Unknown",
        "reviewer_avatar": reviewer.avatar_url if reviewer else None,
        "seller_id": r.seller_id,
        "listing_id": r.listing_id,
        "is_positive": r.is_positive,
        "comment": r.comment,
        "created_at": r.created_at.isoformat(),
    }
