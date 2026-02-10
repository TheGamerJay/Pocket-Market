import os
from flask import Blueprint, request, jsonify, redirect, current_app
from flask_login import login_user
from authlib.integrations.flask_client import OAuth

from extensions import db
from models import User

oauth_bp = Blueprint("oauth", __name__)
oauth = OAuth()


def init_oauth(app):
    """Call in create_app() to register the Google OAuth client."""
    oauth.init_app(app)
    oauth.register(
        name="google",
        client_id=os.environ.get("GOOGLE_CLIENT_ID"),
        client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )


@oauth_bp.get("/google/start")
def google_start():
    """Redirect the browser to Google's consent screen."""
    redirect_uri = request.url_root.rstrip("/") + "/api/auth/google/callback"
    return oauth.google.authorize_redirect(redirect_uri)


@oauth_bp.get("/google/callback")
def google_callback():
    """Google redirects here after consent. Create/find user, log in via session, redirect to frontend."""
    token = oauth.google.authorize_access_token()
    userinfo = token.get("userinfo")
    if not userinfo:
        return jsonify({"error": "Google did not return user info"}), 400

    sub = userinfo.get("sub")
    email = userinfo.get("email", "")
    name = userinfo.get("name", "")
    picture = userinfo.get("picture", "")

    # Find existing user by google_sub or email
    user = User.query.filter_by(google_sub=sub).first()
    if not user and email:
        user = User.query.filter_by(email=email).first()

    if user:
        # Link Google to existing account and update profile
        user.google_sub = sub
        user.avatar_url = picture or user.avatar_url
        user.display_name = user.display_name or name
    else:
        # Create new user (no password since they auth via Google)
        user = User(
            email=email,
            google_sub=sub,
            display_name=name or None,
            avatar_url=picture or None,
        )
        db.session.add(user)

    db.session.commit()
    login_user(user)

    # Redirect to frontend
    return redirect(current_app.config["FRONTEND_ORIGIN"] + "/")
