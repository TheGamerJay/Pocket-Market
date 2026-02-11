from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from extensions import db
from models import Offer, Listing, Notification, User

offers_bp = Blueprint("offers", __name__)


@offers_bp.post("/make")
@login_required
def make_offer():
    data = request.get_json(force=True)
    listing_id = data.get("listing_id")
    amount_cents = int(data.get("amount_cents") or 0)

    if amount_cents <= 0:
        return jsonify({"error": "Offer must be > $0"}), 400

    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Listing not found"}), 404
    if l.user_id == current_user.id:
        return jsonify({"error": "Can't offer on your own listing"}), 400
    if l.is_sold:
        return jsonify({"error": "Item is already sold"}), 400

    offer = Offer(
        listing_id=listing_id,
        buyer_id=current_user.id,
        seller_id=l.user_id,
        amount_cents=amount_cents,
    )
    db.session.add(offer)

    buyer_name = current_user.display_name or current_user.email
    amt = amount_cents / 100
    db.session.add(Notification(
        user_id=l.user_id,
        listing_id=listing_id,
        message=f'{buyer_name} offered ${amt:.0f} on "{l.title}"',
    ))

    db.session.commit()
    return jsonify({"ok": True, "offer": _offer_dict(offer)}), 201


@offers_bp.get("/listing/<listing_id>")
@login_required
def listing_offers(listing_id):
    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Not found"}), 404

    offers = Offer.query.filter_by(listing_id=listing_id).order_by(Offer.created_at.desc()).all()
    return jsonify({"offers": [_offer_dict(o) for o in offers]}), 200


@offers_bp.post("/<offer_id>/respond")
@login_required
def respond_offer(offer_id):
    offer = db.session.get(Offer, offer_id)
    if not offer:
        return jsonify({"error": "Offer not found"}), 404
    if offer.seller_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403
    if offer.status != "pending":
        return jsonify({"error": "Offer already responded to"}), 400

    data = request.get_json(force=True)
    action = data.get("action")  # "accept" | "decline" | "counter"

    l = db.session.get(Listing, offer.listing_id)
    title = l.title if l else "item"

    if action == "accept":
        offer.status = "accepted"
        db.session.add(Notification(
            user_id=offer.buyer_id,
            listing_id=offer.listing_id,
            message=f'Your offer on "{title}" was accepted!',
        ))
    elif action == "decline":
        offer.status = "declined"
        db.session.add(Notification(
            user_id=offer.buyer_id,
            listing_id=offer.listing_id,
            message=f'Your offer on "{title}" was declined.',
        ))
    elif action == "counter":
        counter_cents = int(data.get("counter_cents") or 0)
        if counter_cents <= 0:
            return jsonify({"error": "Counter must be > $0"}), 400
        offer.status = "countered"
        offer.counter_cents = counter_cents
        amt = counter_cents / 100
        db.session.add(Notification(
            user_id=offer.buyer_id,
            listing_id=offer.listing_id,
            message=f'Seller countered with ${amt:.0f} on "{title}"',
        ))
    else:
        return jsonify({"error": "Invalid action"}), 400

    db.session.commit()
    return jsonify({"ok": True, "offer": _offer_dict(offer)}), 200


def _offer_dict(o):
    buyer = db.session.get(User, o.buyer_id)
    return {
        "id": o.id,
        "listing_id": o.listing_id,
        "buyer_id": o.buyer_id,
        "buyer_name": buyer.display_name or buyer.email if buyer else "Unknown",
        "seller_id": o.seller_id,
        "amount_cents": o.amount_cents,
        "status": o.status,
        "counter_cents": o.counter_cents,
        "created_at": o.created_at.isoformat(),
    }
