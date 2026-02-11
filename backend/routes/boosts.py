import random
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from extensions import db
from models import Boost, BoostImpression, Listing

boosts_bp = Blueprint("boosts", __name__)

@boosts_bp.get("/featured")
def featured():
    now = datetime.utcnow()
    active = Boost.query.filter(Boost.status == "active", Boost.ends_at > now).all()
    if not active:
        return jsonify({"featured_listing_ids": []}), 200

    sample = random.sample(active, k=min(5, len(active)))
    listing_ids = [b.listing_id for b in sample]

    viewer_id = current_user.id if current_user.is_authenticated else None
    for b in sample:
        db.session.add(BoostImpression(boost_id=b.id, viewer_user_id=viewer_id))
    db.session.commit()

    return jsonify({"featured_listing_ids": listing_ids}), 200

@boosts_bp.get("/durations")
def durations():
    return jsonify({
        "durations": [
            {"label": "24 Hours", "hours": 24, "price_usd": 3},
            {"label": "3 Days", "hours": 72, "price_usd": 7},
            {"label": "7 Days", "hours": 168, "price_usd": 12},
        ]
    }), 200


@boosts_bp.post("/activate")
@login_required
def activate_boost():
    data = request.get_json(force=True)
    listing_id = data.get("listing_id")
    hours = int(data.get("hours") or 0)

    durations_map = {24: 300, 72: 700, 168: 1200}
    if hours not in durations_map:
        return jsonify({"error": "Invalid duration"}), 400

    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Listing not found"}), 404
    if l.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    now = datetime.utcnow()
    existing = Boost.query.filter(
        Boost.listing_id == listing_id,
        Boost.status == "active",
        Boost.ends_at > now,
    ).first()
    if existing:
        return jsonify({"error": "Already boosted"}), 400

    boost = Boost(
        listing_id=listing_id,
        starts_at=now,
        ends_at=now + timedelta(hours=hours),
        status="active",
        paid_cents=durations_map[hours],
    )
    db.session.add(boost)
    db.session.commit()

    return jsonify({"ok": True, "boost": {
        "id": boost.id,
        "ends_at": boost.ends_at.isoformat(),
        "hours": hours,
    }}), 201
