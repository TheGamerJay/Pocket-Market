import random
import stripe
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, current_app
from flask_login import current_user, login_required

from extensions import db
from models import Boost, BoostImpression, Listing, ListingImage, Subscription, User

boosts_bp = Blueprint("boosts", __name__)

# Round-robin offset — rotates which group of 10 gets shown each request
_rotation_offset = 0

DURATIONS = [
    {"label": "24 Hours", "hours": 24, "price_usd": 3, "price_cents": 300, "config_key": "BOOST_24H_PRICE_ID"},
    {"label": "3 Days",   "hours": 72, "price_usd": 7, "price_cents": 700, "config_key": "BOOST_3D_PRICE_ID"},
    {"label": "7 Days",   "hours": 168, "price_usd": 12, "price_cents": 1200, "config_key": "BOOST_7D_PRICE_ID"},
]
DURATIONS_MAP = {d["hours"]: d["price_cents"] for d in DURATIONS}
DURATION_CONFIG = {d["hours"]: d["config_key"] for d in DURATIONS}


def _est_now():
    """Return current time in US Eastern (UTC-5)."""
    return datetime.utcnow() - timedelta(hours=5)


def _est_today_str():
    """Return today's Eastern date as 'YYYY-MM-DD'."""
    return _est_now().strftime("%Y-%m-%d")


def _free_boost_available(user):
    """Check if Pro user can use their daily free boost."""
    if not user.is_pro:
        return False
    return user.pro_free_boost_last_used_day != _est_today_str()


def _seconds_until_reset():
    """Seconds remaining until midnight EST (next free boost)."""
    now = _est_now()
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

    # Rotate through all active boosts in groups of 10 (no duplicates)
    total = len(active)
    batch_size = min(10, total)
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

    # Return full listing data for the featured items
    featured_listings = []
    for lid in listing_ids:
        l = db.session.get(Listing, lid)
        if not l or l.is_draft:
            continue
        imgs = ListingImage.query.filter_by(listing_id=l.id).order_by(ListingImage.created_at.asc()).all()
        seller = db.session.get(User, l.user_id)
        featured_listings.append({
            "id": l.id,
            "title": l.title,
            "price_cents": l.price_cents,
            "is_sold": l.is_sold,
            "is_demo": bool(l.is_demo),
            "images": [i.image_url for i in imgs],
            "is_pro_seller": bool(seller and seller.is_pro),
            "created_at": l.created_at.isoformat(),
        })

    return jsonify({"featured_listing_ids": listing_ids, "featured_listings": featured_listings}), 200


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
            "Anyone can purchase a boost (24h, 3-day, or 7-day).",
            "Pro members get 1 free 24-hour boost every day.",
            "Free boosts reset at midnight UTC — use it or lose it.",
            "Only 1 active boost per listing at a time.",
            "Boosted listings appear in the Featured section on the home page.",
        ]
    }), 200


@boosts_bp.post("/activate")
@login_required
def activate_boost():
    """Activate a FREE daily Pro boost only. Paid boosts go through /create-checkout."""
    data = request.get_json(force=True)
    listing_id = data.get("listing_id")

    # Only free boosts through this endpoint
    if not current_user.is_pro:
        return jsonify({"error": "Upgrade to Pro to boost listings"}), 403

    listing = db.session.get(Listing, listing_id)
    if not listing:
        return jsonify({"error": "Listing not found"}), 404
    if listing.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    if not _free_boost_available(current_user):
        secs = _seconds_until_reset()
        return jsonify({
            "error": "Free boost already used today",
            "countdown_seconds": secs,
        }), 429

    now = datetime.utcnow()

    # Auto-expire stale boosts
    Boost.query.filter(
        Boost.listing_id == listing_id,
        Boost.status == "active",
        Boost.ends_at <= now,
    ).update({"status": "expired"})

    existing = Boost.query.filter(
        Boost.listing_id == listing_id,
        Boost.status == "active",
        Boost.ends_at > now,
    ).first()
    if existing:
        return jsonify({"error": "This listing already has an active boost"}), 409

    boost = Boost(
        listing_id=listing_id,
        starts_at=now,
        ends_at=now + timedelta(hours=24),
        duration_hours=24,
        status="active",
        paid_cents=0,
        boost_type="free_pro",
    )
    db.session.add(boost)
    current_user.pro_free_boost_last_used_day = _est_today_str()

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "This listing already has an active boost"}), 409

    return jsonify({"ok": True, "boost": {
        "id": boost.id,
        "ends_at": boost.ends_at.isoformat(),
        "hours": 24,
        "boost_type": "free_pro",
    }}), 201


@boosts_bp.post("/create-checkout")
@login_required
def create_boost_checkout():
    """Create a Stripe Checkout session for a paid boost."""
    stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]

    data = request.get_json(force=True)
    listing_id = data.get("listing_id")
    hours = int(data.get("hours") or 0)

    if hours not in DURATION_CONFIG:
        return jsonify({"error": "Invalid duration"}), 400

    price_id = current_app.config.get(DURATION_CONFIG[hours])
    if not price_id:
        return jsonify({"error": "Boost payments not configured"}), 500

    listing = db.session.get(Listing, listing_id)
    if not listing:
        return jsonify({"error": "Listing not found"}), 404
    if listing.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    now = datetime.utcnow()
    Boost.query.filter(
        Boost.listing_id == listing_id,
        Boost.status == "active",
        Boost.ends_at <= now,
    ).update({"status": "expired"})
    db.session.commit()

    existing = Boost.query.filter(
        Boost.listing_id == listing_id,
        Boost.status == "active",
        Boost.ends_at > now,
    ).first()
    if existing:
        return jsonify({"error": "This listing already has an active boost"}), 409

    # Get or create Stripe customer
    sub = Subscription.query.filter_by(user_id=current_user.id).first()
    customer_id = sub.stripe_customer_id if sub and sub.stripe_customer_id else None
    if not customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.display_name or current_user.email,
            metadata={"pocket_market_user_id": current_user.id},
        )
        customer_id = customer.id

    origin = request.origin or current_app.config.get("FRONTEND_ORIGIN", "https://pocket-market.com")

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="payment",
        success_url=f"{origin}/listing/{listing_id}?boosted=1",
        cancel_url=f"{origin}/listing/{listing_id}?boost_canceled=1",
        metadata={
            "pocket_market_user_id": current_user.id,
            "boost_listing_id": listing_id,
            "boost_hours": str(hours),
        },
    )

    return jsonify({"url": session.url}), 200
