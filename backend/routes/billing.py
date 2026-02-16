import stripe
from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user

from extensions import db
from models import User, Subscription, Boost, Listing

billing_bp = Blueprint("billing", __name__)


def _init_stripe():
    stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]


def _get_or_create_stripe_customer(user):
    sub = Subscription.query.filter_by(user_id=user.id).first()
    if sub and sub.stripe_customer_id:
        return sub.stripe_customer_id

    customer = stripe.Customer.create(
        email=user.email,
        name=user.display_name or user.email,
        metadata={"pocket_market_user_id": user.id},
    )
    return customer.id


# ── GET /api/billing/status ──────────────────────────────────────
@billing_bp.get("/status")
@login_required
def status():
    sub = (
        Subscription.query
        .filter_by(user_id=current_user.id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    return jsonify({
        "is_pro": current_user.is_pro,
        "subscription": None if not sub else {
            "status": sub.status,
            "current_period_end": (
                sub.current_period_end.isoformat()
                if sub.current_period_end else None
            ),
        },
    }), 200


# ── POST /api/billing/create-checkout-session ────────────────────
@billing_bp.post("/create-checkout-session")
@login_required
def create_checkout_session():
    _init_stripe()

    customer_id = _get_or_create_stripe_customer(current_user)

    origin = request.origin or current_app.config.get("FRONTEND_ORIGIN", "https://pocket-market.com")

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{
            "price": current_app.config["STRIPE_PRO_PRICE_ID"],
            "quantity": 1,
        }],
        mode="subscription",
        success_url=f"{origin}/pro?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/pro?canceled=1",
        metadata={"pocket_market_user_id": current_user.id},
    )

    return jsonify({"url": session.url}), 200


# ── POST /api/billing/create-portal-session ──────────────────────
@billing_bp.post("/create-portal-session")
@login_required
def create_portal_session():
    _init_stripe()

    sub = Subscription.query.filter_by(user_id=current_user.id).first()
    if not sub or not sub.stripe_customer_id:
        return jsonify({"error": "No subscription found"}), 404

    origin = request.origin or current_app.config.get("FRONTEND_ORIGIN", "https://pocket-market.com")

    portal_session = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=f"{origin}/pro",
    )

    return jsonify({"url": portal_session.url}), 200


# ── POST /api/billing/webhook ────────────────────────────────────
@billing_bp.post("/webhook")
def stripe_webhook():
    _init_stripe()

    payload = request.get_data(as_text=False)
    sig_header = request.headers.get("Stripe-Signature")
    webhook_secret = current_app.config["STRIPE_WEBHOOK_SECRET"]

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        current_app.logger.error("Stripe webhook: invalid payload")
        return jsonify({"error": "Invalid payload"}), 400
    except stripe.error.SignatureVerificationError:
        current_app.logger.error("Stripe webhook: invalid signature")
        return jsonify({"error": "Invalid signature"}), 400

    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(data_object)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(data_object)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(data_object)
    elif event_type == "invoice.payment_failed":
        _handle_payment_failed(data_object)

    return jsonify({"received": True}), 200


# ── Webhook handlers ─────────────────────────────────────────────

def _handle_checkout_completed(session):
    metadata = session.get("metadata", {})

    # ── Boost one-time payment ──
    if metadata.get("boost_listing_id"):
        _handle_boost_payment(session)
        return

    # ── Pro subscription ──
    customer_id = session["customer"]
    subscription_id = session.get("subscription")
    user_id = metadata.get("pocket_market_user_id")

    if not user_id:
        existing = Subscription.query.filter_by(stripe_customer_id=customer_id).first()
        if existing:
            user_id = existing.user_id
        else:
            current_app.logger.error(
                f"checkout.session.completed: cannot find user for customer {customer_id}"
            )
            return

    if not subscription_id:
        return

    stripe_sub = stripe.Subscription.retrieve(subscription_id)

    sub = Subscription.query.filter_by(user_id=user_id).first()
    if not sub:
        sub = Subscription(user_id=user_id)
        db.session.add(sub)

    sub.stripe_customer_id = customer_id
    sub.stripe_subscription_id = subscription_id
    sub.status = stripe_sub["status"]
    sub.current_period_end = datetime.fromtimestamp(
        stripe_sub["current_period_end"], tz=timezone.utc
    )

    user = db.session.get(User, user_id)
    if user:
        user.is_pro = True

    db.session.commit()


def _handle_boost_payment(session):
    metadata = session.get("metadata", {})
    listing_id = metadata.get("boost_listing_id")
    hours = int(metadata.get("boost_hours", 24))
    user_id = metadata.get("pocket_market_user_id")

    if not listing_id or not user_id:
        current_app.logger.error("Boost payment missing metadata")
        return

    listing = db.session.get(Listing, listing_id)
    if not listing:
        current_app.logger.error(f"Boost payment: listing {listing_id} not found")
        return

    now = datetime.now(timezone.utc)

    # Auto-expire stale boosts
    Boost.query.filter(
        Boost.listing_id == listing_id,
        Boost.status == "active",
        Boost.ends_at <= now,
    ).update({"status": "expired"})

    # Check if already boosted
    existing = Boost.query.filter(
        Boost.listing_id == listing_id,
        Boost.status == "active",
        Boost.ends_at > now,
    ).first()
    if existing:
        current_app.logger.warning(f"Boost payment: listing {listing_id} already boosted")
        return

    paid_cents = session.get("amount_total", 0)

    boost = Boost(
        listing_id=listing_id,
        starts_at=now,
        ends_at=now + timedelta(hours=hours),
        duration_hours=hours,
        status="active",
        paid_cents=paid_cents,
        boost_type="paid",
    )
    db.session.add(boost)
    db.session.commit()
    current_app.logger.info(f"Boost activated for listing {listing_id}, {hours}h, paid {paid_cents}c")


def _handle_subscription_updated(subscription):
    sub = Subscription.query.filter_by(
        stripe_subscription_id=subscription["id"]
    ).first()
    if not sub:
        return

    sub.status = subscription["status"]
    sub.current_period_end = datetime.fromtimestamp(
        subscription["current_period_end"], tz=timezone.utc
    )

    user = db.session.get(User, sub.user_id)
    if user:
        user.is_pro = subscription["status"] in ("active", "trialing")

    db.session.commit()


def _handle_subscription_deleted(subscription):
    sub = Subscription.query.filter_by(
        stripe_subscription_id=subscription["id"]
    ).first()
    if not sub:
        return

    sub.status = "canceled"
    sub.current_period_end = datetime.fromtimestamp(
        subscription["current_period_end"], tz=timezone.utc
    )

    user = db.session.get(User, sub.user_id)
    if user:
        user.is_pro = False

    db.session.commit()


def _handle_payment_failed(invoice):
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return

    sub = Subscription.query.filter_by(
        stripe_subscription_id=subscription_id
    ).first()
    if not sub:
        return

    sub.status = "past_due"

    user = db.session.get(User, sub.user_id)
    if user:
        user.is_pro = False

    db.session.commit()
