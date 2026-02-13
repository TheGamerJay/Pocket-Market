import os
import uuid
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_login import login_required, current_user

from sqlalchemy import func
from extensions import db
from models import Listing, ListingImage, SafeMeetLocation, Boost, Observing, Notification, User, PriceHistory, ListingView

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
    view_count = db.session.query(func.count(ListingView.id)).filter_by(listing_id=l.id).scalar()

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
        "renewed_at": l.renewed_at.isoformat() if l.renewed_at else None,
        "bundle_discount_pct": l.bundle_discount_pct,
        "is_boosted": bool(active_boost),
        "observing_count": observing_count,
        "view_count": view_count,
        "is_pro_seller": bool(seller and seller.is_pro),
        "is_verified_seller": bool(seller and seller.is_verified),
    }

@listings_bp.get("/uploads/<path:filename>")
def uploads(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)

@listings_bp.get("/mine")
@login_required
def my_listings():
    rows = Listing.query.filter_by(user_id=current_user.id).order_by(Listing.created_at.desc()).all()
    return jsonify({"listings": [_listing_to_dict(l) for l in rows]}), 200


@listings_bp.get("/purchases")
@login_required
def purchases():
    rows = Listing.query.filter_by(buyer_id=current_user.id).order_by(Listing.created_at.desc()).all()
    return jsonify({"purchases": [_listing_to_dict(l) for l in rows]}), 200


@listings_bp.get("/drafts")
@login_required
def my_drafts():
    rows = Listing.query.filter_by(user_id=current_user.id, is_draft=True).order_by(Listing.created_at.desc()).all()
    return jsonify({"listings": [_listing_to_dict(l) for l in rows]}), 200


@listings_bp.post("/bulk")
@login_required
def bulk_action():
    data = request.get_json(force=True)
    action = data.get("action")  # "sold", "delete", "renew"
    ids = data.get("listing_ids", [])
    if not ids or action not in ("sold", "delete", "renew"):
        return jsonify({"error": "Invalid action or no listings"}), 400

    count = 0
    for lid in ids:
        l = db.session.get(Listing, lid)
        if not l or l.user_id != current_user.id:
            continue
        if action == "sold":
            l.is_sold = True
        elif action == "delete":
            ListingImage.query.filter_by(listing_id=l.id).delete()
            SafeMeetLocation.query.filter_by(listing_id=l.id).delete()
            db.session.delete(l)
        elif action == "renew":
            l.renewed_at = datetime.utcnow()
        count += 1

    db.session.commit()
    return jsonify({"ok": True, "affected": count}), 200


@listings_bp.post("/meetup-confirm/<token>")
@login_required
def confirm_meetup(token):
    from models import MeetupConfirmation
    mc = MeetupConfirmation.query.filter_by(token=token).first()
    if not mc:
        return jsonify({"error": "Invalid token"}), 404
    l = db.session.get(Listing, mc.listing_id)
    if not l:
        return jsonify({"error": "Listing not found"}), 404

    if current_user.id == l.user_id:
        mc.seller_confirmed = True
    elif current_user.id == l.buyer_id:
        mc.buyer_confirmed = True
    else:
        return jsonify({"error": "Forbidden"}), 403

    db.session.commit()

    both = mc.buyer_confirmed and mc.seller_confirmed
    if both:
        l.is_sold = True
        db.session.commit()

    return jsonify({
        "ok": True,
        "buyer_confirmed": mc.buyer_confirmed,
        "seller_confirmed": mc.seller_confirmed,
        "completed": both,
    }), 200


@listings_bp.get("/search")
def search():
    q = (request.args.get("q") or "").strip()
    category = (request.args.get("category") or "").strip()
    city = (request.args.get("city") or "").strip()
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(max(int(request.args.get("per_page", 20)), 1), 100)

    query = Listing.query.filter(Listing.is_sold == False, Listing.is_draft == False)

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

    user_lat = request.args.get("lat", type=float)
    user_lng = request.args.get("lng", type=float)
    radius_km = request.args.get("radius_km", 50, type=float)

    if user_lat is not None and user_lng is not None:
        import math
        lat_delta = radius_km / 111.0
        lng_delta = radius_km / (111.0 * max(math.cos(math.radians(user_lat)), 0.01))
        query = query.filter(
            Listing.lat.isnot(None),
            Listing.lng.isnot(None),
            Listing.lat.between(user_lat - lat_delta, user_lat + lat_delta),
            Listing.lng.between(user_lng - lng_delta, user_lng + lng_delta),
        )

    results = query.order_by(Listing.created_at.desc()).limit(per_page + 1).offset((page - 1) * per_page).all()
    has_more = len(results) > per_page
    results = results[:per_page]
    dicts = [_listing_to_dict(l) for l in results]
    dicts.sort(key=lambda d: (not d["is_pro_seller"], 0))
    return jsonify({"listings": dicts, "page": page, "has_more": has_more}), 200


@listings_bp.get("")
def feed():
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(max(int(request.args.get("per_page", 20)), 1), 100)

    query = Listing.query.filter_by(is_draft=False).order_by(Listing.created_at.desc())

    user_lat = request.args.get("lat", type=float)
    user_lng = request.args.get("lng", type=float)
    radius_km = request.args.get("radius_km", 50, type=float)

    if user_lat is not None and user_lng is not None:
        import math
        lat_delta = radius_km / 111.0
        lng_delta = radius_km / (111.0 * max(math.cos(math.radians(user_lat)), 0.01))
        query = query.filter(
            Listing.lat.isnot(None),
            Listing.lng.isnot(None),
            Listing.lat.between(user_lat - lat_delta, user_lat + lat_delta),
            Listing.lng.between(user_lng - lng_delta, user_lng + lng_delta),
        )

    total_query = query.limit(per_page + 1).offset((page - 1) * per_page).all()
    has_more = len(total_query) > per_page
    listings = total_query[:per_page]

    dicts = [_listing_to_dict(l) for l in listings]
    dicts.sort(key=lambda d: (not d["is_pro_seller"], 0))
    return jsonify({"listings": dicts, "page": page, "has_more": has_more}), 200

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
        is_draft=bool(data.get("is_draft", False)),
    )

    if not l.is_draft and l.price_cents <= 0:
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

    if "bundle_discount_pct" in data:
        val = data.get("bundle_discount_pct")
        l.bundle_discount_pct = int(val) if val is not None else None

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


@listings_bp.post("/<listing_id>/renew")
@login_required
def renew_listing(listing_id):
    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Not found"}), 404
    if l.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    l.renewed_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"ok": True, "renewed_at": l.renewed_at.isoformat()}), 200


@listings_bp.put("/<listing_id>/images/reorder")
@login_required
def reorder_images(listing_id):
    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Not found"}), 404
    if l.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(force=True)
    image_ids = data.get("image_ids", [])
    if not image_ids:
        return jsonify({"error": "image_ids required"}), 400

    # Assign ascending timestamps in the given order
    base_time = datetime(2000, 1, 1)
    for idx, img_id in enumerate(image_ids):
        img = db.session.get(ListingImage, img_id)
        if img and img.listing_id == l.id:
            img.created_at = base_time + timedelta(seconds=idx)

    db.session.commit()
    return jsonify({"ok": True}), 200


@listings_bp.post("/<listing_id>/view")
def track_view(listing_id):
    from flask_login import current_user as cu
    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Not found"}), 404
    viewer_id = cu.id if hasattr(cu, 'id') and cu.is_authenticated else None
    # Don't track owner views
    if viewer_id and viewer_id == l.user_id:
        return jsonify({"ok": True}), 200
    db.session.add(ListingView(listing_id=listing_id, viewer_id=viewer_id))
    db.session.commit()
    return jsonify({"ok": True}), 200


@listings_bp.post("/<listing_id>/publish")
@login_required
def publish_draft(listing_id):
    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Not found"}), 404
    if l.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403
    if l.price_cents <= 0:
        return jsonify({"error": "Set a price before publishing"}), 400
    l.is_draft = False
    db.session.commit()
    return jsonify({"ok": True, "listing": _listing_to_dict(l)}), 200


@listings_bp.post("/<listing_id>/meetup-token")
@login_required
def create_meetup_token(listing_id):
    import secrets
    from models import MeetupConfirmation
    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Not found"}), 404
    # Only seller or buyer can create
    if current_user.id != l.user_id and current_user.id != l.buyer_id:
        return jsonify({"error": "Forbidden"}), 403

    existing = MeetupConfirmation.query.filter_by(listing_id=listing_id).first()
    if existing:
        return jsonify({"token": existing.token, "buyer_confirmed": existing.buyer_confirmed, "seller_confirmed": existing.seller_confirmed}), 200

    token = secrets.token_urlsafe(32)
    mc = MeetupConfirmation(listing_id=listing_id, token=token)
    db.session.add(mc)
    db.session.commit()
    return jsonify({"token": mc.token, "buyer_confirmed": False, "seller_confirmed": False}), 201
