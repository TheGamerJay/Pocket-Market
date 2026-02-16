from functools import wraps
from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from sqlalchemy import text, func

from extensions import db
from models import User, Listing, ListingImage, Report, Review, Ad

admin_bp = Blueprint("admin", __name__)


def admin_required(f):
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        # Allow if user has is_admin flag
        if getattr(current_user, "is_admin", False):
            return f(*args, **kwargs)
        # Allow if valid admin secret provided (lets admin use any account)
        secret = request.headers.get("X-Admin-Secret", "")
        cron = current_app.config.get("CRON_SECRET", "")
        if secret and cron and secret == cron:
            return f(*args, **kwargs)
        return jsonify({"error": "Admin access required"}), 403
    return decorated


# ── Dashboard ──

@admin_bp.get("/dashboard")
@admin_required
def dashboard():
    total_users = User.query.count()
    total_listings = Listing.query.filter_by(is_sold=False, is_draft=False).count()
    open_reports = Report.query.filter_by(status="open").count()
    sold_count = Listing.query.filter_by(is_sold=True).count()
    review_count = Review.query.count()

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    signups_7d = User.query.filter(User.created_at >= week_ago).count()

    recent = User.query.order_by(User.created_at.desc()).limit(10).all()
    recent_signups = [{
        "id": u.id, "email": u.email, "display_name": u.display_name,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "is_pro": bool(u.is_pro), "is_banned": bool(getattr(u, "is_banned", False)),
    } for u in recent]

    return jsonify({
        "total_users": total_users,
        "total_listings": total_listings,
        "open_reports": open_reports,
        "signups_7d": signups_7d,
        "sold_count": sold_count,
        "review_count": review_count,
        "recent_signups": recent_signups,
    })


# ── Users ──

@admin_bp.get("/users")
@admin_required
def list_users():
    q = request.args.get("q", "").strip()
    page = int(request.args.get("page", 1))
    per_page = 20

    query = User.query
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(User.email.ilike(like), User.display_name.ilike(like)))
    query = query.order_by(User.created_at.desc())
    total = query.count()
    users = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "users": [{
            "id": u.id, "email": u.email, "display_name": u.display_name,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_seen": u.last_seen.isoformat() if u.last_seen else None,
            "is_pro": bool(u.is_pro), "is_verified": bool(u.is_verified),
            "is_banned": bool(getattr(u, "is_banned", False)),
            "is_admin": bool(getattr(u, "is_admin", False)),
        } for u in users],
        "total": total,
        "page": page,
        "pages": (total + per_page - 1) // per_page,
    })


@admin_bp.post("/users/<user_id>/ban")
@admin_required
def toggle_ban(user_id):
    u = db.session.get(User, user_id)
    if not u:
        return jsonify({"error": "User not found"}), 404
    if u.id == current_user.id:
        return jsonify({"error": "Cannot ban yourself"}), 400
    u.is_banned = not u.is_banned
    db.session.commit()
    return jsonify({"ok": True, "is_banned": u.is_banned})


@admin_bp.delete("/users/<user_id>")
@admin_required
def delete_user(user_id):
    u = db.session.get(User, user_id)
    if not u:
        return jsonify({"error": "User not found"}), 404
    if u.id == current_user.id:
        return jsonify({"error": "Cannot delete yourself"}), 400

    uid = u.id

    # Delete all user's listings and their dependents
    user_listings = Listing.query.filter_by(user_id=uid).all()
    for listing in user_listings:
        lid = listing.id
        for stmt in [
            "DELETE FROM boost_impressions WHERE boost_id IN (SELECT id FROM boosts WHERE listing_id=:lid)",
            "DELETE FROM boosts WHERE listing_id=:lid",
            "DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE listing_id=:lid)",
            "DELETE FROM conversations WHERE listing_id=:lid",
            "DELETE FROM safe_meet_locations WHERE listing_id=:lid",
            "DELETE FROM safety_ack_events WHERE listing_id=:lid",
            "DELETE FROM observing WHERE listing_id=:lid",
            "DELETE FROM notifications WHERE listing_id=:lid",
            "DELETE FROM offers WHERE listing_id=:lid",
            "DELETE FROM price_history WHERE listing_id=:lid",
            "DELETE FROM reviews WHERE listing_id=:lid",
            "DELETE FROM listing_views WHERE listing_id=:lid",
            "DELETE FROM meetup_confirmations WHERE listing_id=:lid",
            "DELETE FROM listing_images WHERE listing_id=:lid",
            "DELETE FROM reports WHERE listing_id=:lid",
        ]:
            db.session.execute(text(stmt), {"lid": lid})
        db.session.delete(listing)

    # Delete user-level data (order matters for FK constraints)
    for stmt in [
        "DELETE FROM boost_impressions WHERE viewer_user_id=:uid",
        "DELETE FROM messages WHERE sender_id=:uid",
        "DELETE FROM conversations WHERE buyer_id=:uid OR seller_id=:uid",
        "DELETE FROM observing WHERE user_id=:uid",
        "DELETE FROM notifications WHERE user_id=:uid",
        "DELETE FROM offers WHERE buyer_id=:uid OR seller_id=:uid",
        "DELETE FROM reviews WHERE reviewer_id=:uid OR seller_id=:uid",
        "DELETE FROM reports WHERE reporter_id=:uid OR reported_user_id=:uid OR resolved_by=:uid",
        "DELETE FROM safety_ack_events WHERE user_id=:uid",
        "DELETE FROM saved_searches WHERE user_id=:uid",
        "DELETE FROM subscriptions WHERE user_id=:uid",
        "DELETE FROM push_subscriptions WHERE user_id=:uid",
        "DELETE FROM blocked_users WHERE blocker_id=:uid OR blocked_id=:uid",
        "DELETE FROM listing_views WHERE user_id=:uid",
    ]:
        db.session.execute(text(stmt), {"uid": uid})

    db.session.delete(u)
    db.session.commit()
    return jsonify({"ok": True})


@admin_bp.post("/users/<user_id>/toggle-pro")
@admin_required
def toggle_pro(user_id):
    u = db.session.get(User, user_id)
    if not u:
        return jsonify({"error": "User not found"}), 404
    u.is_pro = not u.is_pro
    db.session.commit()
    return jsonify({"ok": True, "is_pro": u.is_pro})


@admin_bp.post("/users/<user_id>/toggle-verified")
@admin_required
def toggle_verified(user_id):
    u = db.session.get(User, user_id)
    if not u:
        return jsonify({"error": "User not found"}), 404
    u.is_verified = not u.is_verified
    db.session.commit()
    return jsonify({"ok": True, "is_verified": u.is_verified})


# ── Listings ──

@admin_bp.get("/listings")
@admin_required
def list_listings():
    q = request.args.get("q", "").strip()
    page = int(request.args.get("page", 1))
    per_page = 20

    query = Listing.query
    if q:
        like = f"%{q}%"
        query = query.filter(Listing.title.ilike(like))
    query = query.order_by(Listing.created_at.desc())
    total = query.count()
    listings = query.offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for l in listings:
        img = ListingImage.query.filter_by(listing_id=l.id).first()
        seller = db.session.get(User, l.user_id)
        result.append({
            "id": l.id, "title": l.title,
            "price_cents": l.price_cents, "category": l.category,
            "is_sold": l.is_sold, "is_draft": l.is_draft, "is_demo": l.is_demo,
            "created_at": l.created_at.isoformat() if l.created_at else None,
            "image_url": img.image_url if img else None,
            "seller_email": seller.email if seller else None,
        })

    return jsonify({"listings": result, "total": total, "page": page, "pages": (total + per_page - 1) // per_page})


@admin_bp.delete("/listings/<listing_id>")
@admin_required
def delete_listing(listing_id):
    listing = db.session.get(Listing, listing_id)
    if not listing:
        return jsonify({"error": "Listing not found"}), 404

    # Cascade delete dependents
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
        ("listing_images", "listing_id=:lid"),
    ]:
        try:
            db.session.execute(text(f"DELETE FROM {tbl} WHERE {col}"), {"lid": listing_id})
        except Exception:
            db.session.rollback()
    try:
        db.session.execute(text("DELETE FROM reports WHERE listing_id=:lid"), {"lid": listing_id})
    except Exception:
        db.session.rollback()

    db.session.delete(listing)
    db.session.commit()
    return jsonify({"ok": True})


# ── Reports ──

@admin_bp.get("/reports")
@admin_required
def list_reports():
    status_filter = request.args.get("status", "").strip()
    page = int(request.args.get("page", 1))
    per_page = 20

    query = Report.query
    if status_filter:
        query = query.filter_by(status=status_filter)
    query = query.order_by(Report.created_at.desc())
    total = query.count()
    reports = query.offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for r in reports:
        reporter = db.session.get(User, r.reporter_id)
        reported = db.session.get(User, r.reported_user_id) if r.reported_user_id else None
        result.append({
            "id": r.id, "reason": r.reason, "status": r.status,
            "reporter_email": reporter.email if reporter else None,
            "reported_email": reported.email if reported else None,
            "reported_user_id": r.reported_user_id,
            "listing_id": getattr(r, "listing_id", None),
            "admin_notes": getattr(r, "admin_notes", None),
            "resolved_at": r.resolved_at.isoformat() if getattr(r, "resolved_at", None) else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return jsonify({"reports": result, "total": total, "page": page, "pages": (total + per_page - 1) // per_page})


@admin_bp.post("/reports/<report_id>/resolve")
@admin_required
def resolve_report(report_id):
    r = db.session.get(Report, report_id)
    if not r:
        return jsonify({"error": "Report not found"}), 404
    data = request.get_json(force=True)
    r.status = data.get("status", "resolved")
    r.admin_notes = data.get("admin_notes", "")
    r.resolved_by = current_user.id
    r.resolved_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"ok": True})


# ── Reviews ──

@admin_bp.get("/reviews")
@admin_required
def list_reviews():
    page = int(request.args.get("page", 1))
    per_page = 20

    query = Review.query.order_by(Review.created_at.desc())
    total = query.count()
    reviews = query.offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for rv in reviews:
        reviewer = db.session.get(User, rv.reviewer_id)
        seller = db.session.get(User, rv.seller_id)
        result.append({
            "id": rv.id,
            "is_positive": rv.is_positive,
            "comment": rv.comment,
            "reviewer_email": reviewer.email if reviewer else None,
            "seller_email": seller.email if seller else None,
            "seller_id": rv.seller_id,
            "listing_id": rv.listing_id,
            "created_at": rv.created_at.isoformat() if rv.created_at else None,
        })

    return jsonify({"reviews": result, "total": total, "page": page, "pages": (total + per_page - 1) // per_page})


@admin_bp.delete("/reviews/<review_id>")
@admin_required
def delete_review(review_id):
    rv = db.session.get(Review, review_id)
    if not rv:
        return jsonify({"error": "Review not found"}), 404

    seller_id = rv.seller_id
    db.session.delete(rv)
    db.session.commit()

    # Recalculate seller rating
    seller = db.session.get(User, seller_id)
    if seller:
        remaining = Review.query.filter_by(seller_id=seller_id).all()
        if remaining:
            pos = sum(1 for r in remaining if r.is_positive)
            seller.rating_avg = round(pos / len(remaining) * 100, 1)
            seller.rating_count = len(remaining)
        else:
            seller.rating_avg = 0
            seller.rating_count = 0
        db.session.commit()

    return jsonify({"ok": True})


# ── Ads ──

@admin_bp.get("/ads")
@admin_required
def list_ads():
    ads = Ad.query.order_by(Ad.created_at.desc()).all()
    return jsonify({"ads": [{
        "id": a.id, "title": a.title, "image_url": a.image_url,
        "link_url": a.link_url, "active": a.active,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in ads]})


@admin_bp.post("/ads")
@admin_required
def create_ad():
    data = request.get_json(force=True)
    ad = Ad(
        title=data.get("title", ""),
        image_url=data.get("image_url", ""),
        link_url=data.get("link_url", ""),
        active=data.get("active", True),
    )
    db.session.add(ad)
    db.session.commit()
    return jsonify({"ok": True, "id": ad.id}), 201


@admin_bp.put("/ads/<ad_id>")
@admin_required
def update_ad(ad_id):
    ad = db.session.get(Ad, ad_id)
    if not ad:
        return jsonify({"error": "Ad not found"}), 404
    data = request.get_json(force=True)
    if "title" in data:
        ad.title = data["title"]
    if "image_url" in data:
        ad.image_url = data["image_url"]
    if "link_url" in data:
        ad.link_url = data["link_url"]
    if "active" in data:
        ad.active = data["active"]
    db.session.commit()
    return jsonify({"ok": True})


@admin_bp.delete("/ads/<ad_id>")
@admin_required
def delete_ad(ad_id):
    ad = db.session.get(Ad, ad_id)
    if not ad:
        return jsonify({"error": "Ad not found"}), 404
    db.session.delete(ad)
    db.session.commit()
    return jsonify({"ok": True})
