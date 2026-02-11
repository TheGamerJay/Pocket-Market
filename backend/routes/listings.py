import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_login import login_required, current_user

from sqlalchemy import func
from extensions import db
from models import Listing, ListingImage, SafeMeetLocation, Boost, Observing, Notification, User, PriceHistory

listings_bp = Blueprint("listings", __name__)

def _listing_to_dict(l: Listing):
    imgs = ListingImage.query.filter_by(listing_id=l.id).order_by(ListingImage.created_at.asc()).all()
    meet = SafeMeetLocation.query.filter_by(listing_id=l.id).first()
    active_boost = Boost.query.filter(
        Boost.listing_id == l.id,
        Boost.status == "active",
        Boost.ends_at > datetime.utcnow()
    ).first()
    observing_count = db.session.query(func.count(Observing.id)).filter_by(listing_id=l.id).scalar()

    seller = db.session.get(User, l.user_id)
    return {
        "id": l.id,
        "user_id": l.user_id,
        "seller_name": (seller.display_name or seller.email) if seller else "Unknown",
        "seller_avatar": seller.avatar_url if seller else None,
        "title": l.title,
        "description": l.description,
        "price_cents": l.price_cents,
        "category": l.category,
        "condition": l.condition,
        "city": l.city,
        "zip": l.zip,
        "lat": l.lat,
        "lng": l.lng,
        "pickup_or_shipping": l.pickup_or_shipping,
        "is_sold": l.is_sold,
        "created_at": l.created_at.isoformat(),
        "images": [i.image_url for i in imgs],
        "safe_meet": None if not meet else {
            "place_name": meet.place_name,
            "address": meet.address,
            "lat": float(meet.lat),
            "lng": float(meet.lng),
            "place_type": meet.place_type
        },
        "is_boosted": bool(active_boost),
        "observing_count": observing_count,
        "is_pro_seller": bool(seller and seller.is_pro),
    }

@listings_bp.get("/uploads/<path:filename>")
def uploads(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)

@listings_bp.get("/mine")
@login_required
def my_listings():
    rows = Listing.query.filter_by(user_id=current_user.id).order_by(Listing.created_at.desc()).all()
    return jsonify({"listings": [_listing_to_dict(l) for l in rows]}), 200


@listings_bp.get("/search")
def search():
    q = (request.args.get("q") or "").strip()
    category = (request.args.get("category") or "").strip()
    city = (request.args.get("city") or "").strip()

    query = Listing.query.filter_by(is_sold=False)

    if q:
        query = query.filter(
            db.or_(
                Listing.title.ilike(f"%{q}%"),
                Listing.description.ilike(f"%{q}%"),
            )
        )
    if category:
        query = query.filter_by(category=category)
    if city:
        query = query.filter(Listing.city.ilike(f"%{city}%"))

    results = query.order_by(Listing.created_at.desc()).limit(50).all()
    dicts = [_listing_to_dict(l) for l in results]
    dicts.sort(key=lambda d: (not d["is_pro_seller"], 0))
    return jsonify({"listings": dicts}), 200


@listings_bp.get("")
def feed():
    listings = Listing.query.order_by(Listing.created_at.desc()).limit(50).all()
    dicts = [_listing_to_dict(l) for l in listings]
    dicts.sort(key=lambda d: (not d["is_pro_seller"], 0))
    return jsonify({"listings": dicts}), 200

@listings_bp.get("/<listing_id>")
def get_listing(listing_id):
    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"listing": _listing_to_dict(l)}), 200

@listings_bp.post("")
@login_required
def create_listing():
    data = request.get_json(force=True)

    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title required"}), 400

    l = Listing(
        user_id=current_user.id,
        title=title,
        description=(data.get("description") or "").strip() or None,
        price_cents=int(data.get("price_cents") or 0),
        category=(data.get("category") or "other").strip(),
        condition=(data.get("condition") or "used").strip(),
        city=(data.get("city") or "").strip() or None,
        zip=(data.get("zip") or "").strip() or None,
        lat=data.get("lat"),
        lng=data.get("lng"),
        pickup_or_shipping=(data.get("pickup_or_shipping") or "pickup").strip(),
    )

    if l.price_cents <= 0:
        return jsonify({"error": "price_cents must be > 0"}), 400

    db.session.add(l)
    db.session.commit()

    return jsonify({"ok": True, "listing": _listing_to_dict(l)}), 201

@listings_bp.put("/<listing_id>")
@login_required
def update_listing(listing_id):
    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Not found"}), 404
    if l.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(force=True)
    old_price = l.price_cents
    old_sold = l.is_sold

    for field in ["title","description","category","condition","city","zip","pickup_or_shipping"]:
        if field in data:
            setattr(l, field, (data.get(field) or "").strip() or None)

    if "price_cents" in data:
        l.price_cents = int(data.get("price_cents") or 0)
        if l.price_cents <= 0:
            return jsonify({"error": "price_cents must be > 0"}), 400

    if "is_sold" in data:
        l.is_sold = bool(data.get("is_sold"))

    # Track price history
    if "price_cents" in data and l.price_cents != old_price:
        db.session.add(PriceHistory(listing_id=l.id, old_cents=old_price, new_cents=l.price_cents))

    db.session.commit()

    # Notify observers about meaningful changes
    messages = []
    if "price_cents" in data and l.price_cents != old_price:
        old_d = old_price / 100
        new_d = l.price_cents / 100
        if l.price_cents < old_price:
            messages.append(f'Price dropped on "{l.title}": ${old_d:.0f} → ${new_d:.0f}')
        else:
            messages.append(f'Price changed on "{l.title}": ${old_d:.0f} → ${new_d:.0f}')
    if "is_sold" in data and l.is_sold != old_sold:
        if l.is_sold:
            messages.append(f'"{l.title}" has been marked as sold')
        else:
            messages.append(f'"{l.title}" is available again!')

    if messages:
        observers = Observing.query.filter_by(listing_id=l.id).all()
        for obs in observers:
            if obs.user_id == current_user.id:
                continue
            for msg in messages:
                db.session.add(Notification(user_id=obs.user_id, listing_id=l.id, message=msg))
        db.session.commit()

    return jsonify({"ok": True, "listing": _listing_to_dict(l)}), 200

@listings_bp.delete("/<listing_id>")
@login_required
def delete_listing(listing_id):
    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Not found"}), 404
    if l.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    ListingImage.query.filter_by(listing_id=l.id).delete()
    SafeMeetLocation.query.filter_by(listing_id=l.id).delete()
    db.session.delete(l)
    db.session.commit()
    return jsonify({"ok": True}), 200

@listings_bp.post("/<listing_id>/images")
@login_required
def upload_images(listing_id):
    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Not found"}), 404
    if l.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    if "files" not in request.files:
        return jsonify({"error": "No files field"}), 400

    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files"}), 400

    max_photos = 10 if current_user.is_pro else 5
    existing = ListingImage.query.filter_by(listing_id=l.id).count()
    if existing + len(files) > max_photos:
        return jsonify({"error": f"Max {max_photos} photos{' (upgrade to Pro for 10)' if not current_user.is_pro else ''}"}), 400

    saved = []
    folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(folder, exist_ok=True)

    for f in files:
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in [".jpg",".jpeg",".png",".webp"]:
            return jsonify({"error": "Only jpg/jpeg/png/webp allowed"}), 400
        name = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(folder, name)
        f.save(path)
        url = f"/api/listings/uploads/{name}"
        db.session.add(ListingImage(listing_id=l.id, image_url=url))
        saved.append(url)

    db.session.commit()
    return jsonify({"ok": True, "images": saved}), 201


@listings_bp.get("/<listing_id>/similar")
def similar_listings(listing_id):
    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"listings": []}), 200

    similar = Listing.query.filter(
        Listing.category == l.category,
        Listing.id != l.id,
        Listing.is_sold == False,
    ).order_by(Listing.created_at.desc()).limit(6).all()

    result = []
    for s in similar:
        img = ListingImage.query.filter_by(listing_id=s.id).order_by(ListingImage.created_at.asc()).first()
        result.append({
            "id": s.id,
            "title": s.title,
            "price_cents": s.price_cents,
            "image": img.image_url if img else None,
            "created_at": s.created_at.isoformat(),
        })
    return jsonify({"listings": result}), 200


@listings_bp.get("/<listing_id>/price-history")
def price_history(listing_id):
    rows = PriceHistory.query.filter_by(listing_id=listing_id).order_by(PriceHistory.changed_at.asc()).all()
    return jsonify({"history": [
        {"old_cents": r.old_cents, "new_cents": r.new_cents, "changed_at": r.changed_at.isoformat()}
        for r in rows
    ]}), 200
