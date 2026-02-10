import uuid
from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

from extensions import db

def _uuid():
    return str(uuid.uuid4())

class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.Text, nullable=True)  # nullable for OAuth-only users

    display_name = db.Column(db.String(120))
    google_sub = db.Column(db.String(255), unique=True, nullable=True, index=True)
    avatar_url = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    rating_avg = db.Column(db.Numeric, default=0)
    rating_count = db.Column(db.Integer, default=0)

    is_pro = db.Column(db.Boolean, default=False)

    def set_password(self, pw: str) -> None:
        self.password_hash = generate_password_hash(pw)

    def check_password(self, pw: str) -> bool:
        return check_password_hash(self.password_hash, pw)

class Listing(db.Model):
    __tablename__ = "listings"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)

    title = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    price_cents = db.Column(db.Integer, nullable=False)

    category = db.Column(db.String(64), nullable=False)
    condition = db.Column(db.String(32), nullable=False)

    city = db.Column(db.String(64))
    zip = db.Column(db.String(16))

    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)

    pickup_or_shipping = db.Column(db.String(16), nullable=False)  # "pickup"|"shipping"
    is_sold = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class ListingImage(db.Model):
    __tablename__ = "listing_images"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    listing_id = db.Column(db.String(36), db.ForeignKey("listings.id"), nullable=False, index=True)
    image_url = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class Observing(db.Model):
    __tablename__ = "observing"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    listing_id = db.Column(db.String(36), db.ForeignKey("listings.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (db.UniqueConstraint("user_id", "listing_id", name="uq_observing_user_listing"),)

class Conversation(db.Model):
    __tablename__ = "conversations"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    listing_id = db.Column(db.String(36), db.ForeignKey("listings.id"), nullable=False, index=True)

    buyer_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    seller_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (db.UniqueConstraint("listing_id", "buyer_id", "seller_id", name="uq_conv_triplet"),)

class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    conversation_id = db.Column(db.String(36), db.ForeignKey("conversations.id"), nullable=False, index=True)
    sender_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class SafeMeetLocation(db.Model):
    __tablename__ = "safe_meet_locations"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    listing_id = db.Column(db.String(36), db.ForeignKey("listings.id"), nullable=False, index=True)

    place_name = db.Column(db.String(255), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    lat = db.Column(db.Numeric, nullable=False)
    lng = db.Column(db.Numeric, nullable=False)
    place_type = db.Column(db.String(64), nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class SafetyAckEvent(db.Model):
    __tablename__ = "safety_ack_events"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    listing_id = db.Column(db.String(36), db.ForeignKey("listings.id"), nullable=True, index=True)

    event_type = db.Column(db.String(64), nullable=False)  # e.g. "private_location_ack"
    ack_text = db.Column(db.Text, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class Boost(db.Model):
    __tablename__ = "boosts"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    listing_id = db.Column(db.String(36), db.ForeignKey("listings.id"), nullable=False, index=True)

    starts_at = db.Column(db.DateTime(timezone=True), nullable=False)
    ends_at = db.Column(db.DateTime(timezone=True), nullable=False)
    status = db.Column(db.String(32), nullable=False)  # "active"|"expired"|"canceled"

    paid_cents = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class BoostImpression(db.Model):
    __tablename__ = "boost_impressions"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    boost_id = db.Column(db.String(36), db.ForeignKey("boosts.id"), nullable=False, index=True)
    viewer_user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)
    shown_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class Subscription(db.Model):
    __tablename__ = "subscriptions"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)

    stripe_customer_id = db.Column(db.String(255))
    stripe_subscription_id = db.Column(db.String(255))

    status = db.Column(db.String(32), nullable=False)  # "active"|"canceled"|"past_due"
    current_period_end = db.Column(db.DateTime(timezone=True))

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class Ad(db.Model):
    __tablename__ = "ads"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    title = db.Column(db.String(255), nullable=False)
    image_url = db.Column(db.Text)
    link_url = db.Column(db.Text)
    active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
