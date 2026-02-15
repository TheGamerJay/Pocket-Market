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
    avatar_data = db.Column(db.LargeBinary, nullable=True)
    avatar_mime = db.Column(db.String(32), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    rating_avg = db.Column(db.Numeric, default=0)
    rating_count = db.Column(db.Integer, default=0)

    is_pro = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=False)
    onboarding_done = db.Column(db.Boolean, default=False)
    last_seen = db.Column(db.DateTime(timezone=True), nullable=True)
    pro_free_boost_last_used_day = db.Column(db.String(10), nullable=True)  # "YYYY-MM-DD" UTC

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
    is_draft = db.Column(db.Boolean, default=False)
    buyer_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    renewed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    nudged_at = db.Column(db.DateTime(timezone=True), nullable=True)
    bundle_discount_pct = db.Column(db.Integer, nullable=True)  # e.g. 10 for 10% off

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
    image_url = db.Column(db.Text, nullable=True)
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

    duration_hours = db.Column(db.Integer, nullable=False, default=24)
    paid_cents = db.Column(db.Integer, nullable=False)
    boost_type = db.Column(db.String(16), nullable=False, default="paid")  # "paid"|"free_pro"
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

class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    listing_id = db.Column(db.String(36), db.ForeignKey("listings.id"), nullable=True, index=True)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class Offer(db.Model):
    __tablename__ = "offers"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    listing_id = db.Column(db.String(36), db.ForeignKey("listings.id"), nullable=False, index=True)
    buyer_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    seller_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    amount_cents = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(32), nullable=False, default="pending")  # "pending"|"accepted"|"declined"|"countered"
    counter_cents = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class SavedSearch(db.Model):
    __tablename__ = "saved_searches"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    search_query = db.Column("query", db.String(255), nullable=False)
    category = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class BlockedUser(db.Model):
    __tablename__ = "blocked_users"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    blocker_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    blocked_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (db.UniqueConstraint("blocker_id", "blocked_id", name="uq_block_pair"),)

class Report(db.Model):
    __tablename__ = "reports"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    reporter_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    reported_user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)
    listing_id = db.Column(db.String(36), db.ForeignKey("listings.id"), nullable=True, index=True)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(32), default="open")  # "open"|"reviewed"|"resolved"
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class PriceHistory(db.Model):
    __tablename__ = "price_history"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    listing_id = db.Column(db.String(36), db.ForeignKey("listings.id"), nullable=False, index=True)
    old_cents = db.Column(db.Integer, nullable=False)
    new_cents = db.Column(db.Integer, nullable=False)
    changed_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    reviewer_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    seller_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    listing_id = db.Column(db.String(36), db.ForeignKey("listings.id"), nullable=False, index=True)
    is_positive = db.Column(db.Boolean, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (db.UniqueConstraint("reviewer_id", "listing_id", name="uq_review_per_listing"),)

class Ad(db.Model):
    __tablename__ = "ads"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    title = db.Column(db.String(255), nullable=False)
    image_url = db.Column(db.Text)
    link_url = db.Column(db.Text)
    active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class ListingView(db.Model):
    __tablename__ = "listing_views"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    listing_id = db.Column(db.String(36), db.ForeignKey("listings.id"), nullable=False, index=True)
    viewer_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class MeetupConfirmation(db.Model):
    __tablename__ = "meetup_confirmations"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    listing_id = db.Column(db.String(36), db.ForeignKey("listings.id"), nullable=False, index=True)
    token = db.Column(db.String(64), unique=True, nullable=False)
    buyer_confirmed = db.Column(db.Boolean, default=False)
    seller_confirmed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class PushSubscription(db.Model):
    __tablename__ = "push_subscriptions"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    endpoint = db.Column(db.Text, nullable=False, unique=True)
    p256dh = db.Column(db.Text, nullable=False)
    auth = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
