import random
import stripe
from collections import defaultdict
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, current_app
from flask_login import current_user, login_required

from extensions import db
from models import Boost, BoostImpression, Listing, ListingImage, Subscription, User

boosts_bp = Blueprint("boosts", __name__)

# ── Configurable constants ──
CAROUSEL_SIZE = 10              # max boosted slots shown per request
PAID_BOOST_WEIGHT = 3           # paid boosts appear 3x more often
FREE_PRO_BOOST_WEIGHT = 1       # free Pro boosts appear at base rate
MAX_SLOTS_PER_SELLER = 2        # anti-spam: same seller can't fill more than 2 slots

# Round-robin offset — rotates which group gets shown each request
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


def _expire_stale_boosts():
    """Expire any boosts past their ends_at. Called before boost operations."""
    now = datetime.utcnow()
    count = Boost.query.filter(
        Boost.status == "active", Boost.ends_at <= now,
    ).update({"status": "expired"})
    if count:
        db.session.commit()
    return count


def _listing_to_dict(l, imgs, seller, boost_ends_at=None):
    """Serialize a listing for the featured response."""
    d = {
        "id": l.id,
        "title": l.title,
        "price_cents": l.price_cents,
        "is_sold": l.is_sold,
        "images": [i.image_url for i in imgs],
        "is_pro_seller": bool(seller and seller.is_pro),
        "created_at": l.created_at.isoformat(),
    }
    if boost_ends_at:
        d["boost_ends_at"] = boost_ends_at.isoformat()
    return d


@boosts_bp.get("/featured")
def featured():
    global _rotation_offset
    now = datetime.utcnow()
    _expire_stale_boosts()

    active = Boost.query.filter(
        Boost.status == "active", Boost.ends_at > now,
    ).order_by(Boost.created_at.asc()).all()

    # ── Weighted selection ──
    # Build a weighted pool: paid boosts get PAID_BOOST_WEIGHT entries,
    # free Pro boosts get FREE_PRO_BOOST_WEIGHT entries
    weighted_pool = []
    for b in active:
        weight = PAID_BOOST_WEIGHT if b.boost_type == "paid" else FREE_PRO_BOOST_WEIGHT
        weighted_pool.extend([b] * weight)

    # Shuffle the weighted pool for randomness
    random.shuffle(weighted_pool)

    # ── Pick slots with anti-spam ──
    # Same seller can only fill MAX_SLOTS_PER_SELLER slots
    seller_count = defaultdict(int)
    seen_listings = set()
    batch = []

    for b in weighted_pool:
        if len(batch) >= CAROUSEL_SIZE:
            break
        # No duplicate listings
        if b.listing_id in seen_listings:
            continue
        # Look up listing to get seller_id
        listing = db.session.get(Listing, b.listing_id)
        if not listing or listing.is_draft or listing.is_sold:
            continue
        # Anti-spam: cap per seller
        if seller_count[listing.user_id] >= MAX_SLOTS_PER_SELLER:
            continue
        batch.append(b)
        seen_listings.add(b.listing_id)
        seller_count[listing.user_id] += 1

    # Record impressions
    viewer_id = current_user.id if current_user.is_authenticated else None
    for b in batch:
        db.session.add(BoostImpression(boost_id=b.id, viewer_user_id=viewer_id))
    if batch:
        db.session.commit()

    # Build listing data for boosted items
    listing_ids = [b.listing_id for b in batch]
    boost_ends_map = {b.listing_id: b.ends_at for b in batch}
    featured_listings = []
    for lid in listing_ids:
        l = db.session.get(Listing, lid)
        if not l:
            continue
        imgs = ListingImage.query.filter_by(listing_id=l.id).order_by(ListingImage.created_at.asc()).all()
        seller = db.session.get(User, l.user_id)
        featured_listings.append(_listing_to_dict(l, imgs, seller, boost_ends_map.get(lid)))

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
    _expire_stale_boosts()
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
    _expire_stale_boosts()
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
    _expire_stale_boosts()
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
