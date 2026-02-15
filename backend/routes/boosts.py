import random
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from extensions import db
from models import Boost, BoostImpression, Listing, User

boosts_bp = Blueprint("boosts", __name__)

# Round-robin offset — rotates which group of 10 gets shown each request
_rotation_offset = 0

DURATIONS = [
    {"label": "24 Hours", "hours": 24, "price_usd": 3, "price_cents": 300},
    {"label": "3 Days",   "hours": 72, "price_usd": 7, "price_cents": 700},
    {"label": "7 Days",   "hours": 168, "price_usd": 12, "price_cents": 1200},
]
DURATIONS_MAP = {d["hours"]: d["price_cents"] for d in DURATIONS}


def _utc_today_str():
    """Return today's UTC date as 'YYYY-MM-DD'."""
    return datetime.utcnow().strftime("%Y-%m-%d")


def _free_boost_available(user):
    """Check if Pro user can use their daily free boost."""
    if not user.is_pro:
        return False
    return user.pro_free_boost_last_used_day != _utc_today_str()


def _seconds_until_reset():
    """Seconds remaining until midnight UTC (next free boost)."""
    now = datetime.utcnow()
    midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return int((midnight - now).total_seconds())


@boosts_bp.get("/featured")
def featured():
    global _rotation_offset
    now = datetime.utcnow()

    # Auto-expire stale boosts
    expired_count = Boost.query.filter(
        Boost.status == "active", Boost.ends_at <= now,
    ).update({"status": "expired"})
    if expired_count:
        db.session.commit()

    active = Boost.query.filter(Boost.status == "active", Boost.ends_at > now).order_by(Boost.created_at.asc()).all()
    if not active:
        return jsonify({"featured_listing_ids": []}), 200

    # Rotate through all active boosts in groups of 10
    total = len(active)
    batch_size = 10
    start = _rotation_offset % total
    _rotation_offset += batch_size

    # Wrap around to get a full batch
    if start + batch_size <= total:
        batch = active[start:start + batch_size]
    else:
        batch = active[start:] + active[:batch_size - (total - start)]

    # Shuffle within the batch for variety
    random.shuffle(batch)
    listing_ids = [b.listing_id for b in batch]

    viewer_id = current_user.id if current_user.is_authenticated else None
    for b in batch:
        db.session.add(BoostImpression(boost_id=b.id, viewer_user_id=viewer_id))
    db.session.commit()

    return jsonify({"featured_listing_ids": listing_ids}), 200


@boosts_bp.get("/durations")
@login_required
def durations():
    is_pro = current_user.is_pro
    free_available = _free_boost_available(current_user)
    return jsonify({
        "durations": [
            {"label": d["label"], "hours": d["hours"], "price_usd": d["price_usd"]}
            for d in DURATIONS
        ],
        "is_pro": is_pro,
        "free_boost_available": free_available,
    }), 200


@boosts_bp.get("/status")
@login_required
def boost_status():
    """Return Pro boost status: whether free boost is available, countdown, etc."""
    is_pro = current_user.is_pro
    free_available = _free_boost_available(current_user)
    countdown_seconds = 0 if free_available else _seconds_until_reset()

    return jsonify({
        "is_pro": is_pro,
        "free_boost_available": free_available,
        "countdown_seconds": countdown_seconds,
        "last_used_day": current_user.pro_free_boost_last_used_day,
    }), 200


@boosts_bp.get("/rules")
def boost_rules():
    """Return boost rules for display in the UI."""
    return jsonify({
        "rules": [
            "Only 1 active boost per listing at a time (free or paid).",
            "Pro members get 1 free 24-hour boost every day.",
            "Free boosts reset at midnight UTC — use it or lose it.",
            "Free boosts cannot stack or extend an existing boost.",
            "All users can purchase paid boosts (24h, 3-day, or 7-day).",
            "Boosted listings appear in the Featured section on the home page.",
        ]
    }), 200


@boosts_bp.post("/activate")
@login_required
def activate_boost():
    data = request.get_json(force=True)
    listing_id = data.get("listing_id")
    hours = int(data.get("hours") or 0)
    use_free = bool(data.get("use_free_boost", False))

    if hours not in DURATIONS_MAP:
        return jsonify({"error": "Invalid duration"}), 400

    listing = db.session.get(Listing, listing_id)
    if not listing:
        return jsonify({"error": "Listing not found"}), 404
    if listing.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    now = datetime.utcnow()

    # Auto-expire stale boosts so partial unique index stays clean
    Boost.query.filter(
        Boost.listing_id == listing_id,
        Boost.status == "active",
        Boost.ends_at <= now,
    ).update({"status": "expired"})

    # Check for truly active boost
    existing = Boost.query.filter(
        Boost.listing_id == listing_id,
        Boost.status == "active",
        Boost.ends_at > now,
    ).first()
    if existing:
        return jsonify({"error": "This listing already has an active boost"}), 409

    if use_free:
        # Validate Pro free boost
        if not current_user.is_pro:
            return jsonify({"error": "Free boosts are for Pro members only"}), 403
        if not _free_boost_available(current_user):
            secs = _seconds_until_reset()
            return jsonify({
                "error": "Free boost already used today",
                "countdown_seconds": secs,
            }), 429
        actual_hours = 24
        paid = 0
        btype = "free_pro"
    else:
        actual_hours = hours
        paid = DURATIONS_MAP[hours]
        btype = "paid"

    boost = Boost(
        listing_id=listing_id,
        starts_at=now,
        ends_at=now + timedelta(hours=actual_hours),
        duration_hours=actual_hours,
        status="active",
        paid_cents=paid,
        boost_type=btype,
    )
    db.session.add(boost)

    if use_free:
        current_user.pro_free_boost_last_used_day = _utc_today_str()

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "This listing already has an active boost"}), 409

    return jsonify({"ok": True, "boost": {
        "id": boost.id,
        "ends_at": boost.ends_at.isoformat(),
        "hours": actual_hours,
        "boost_type": btype,
    }}), 201
