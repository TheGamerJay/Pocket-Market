from flask import Blueprint, request, jsonify
from flask_login import current_user

from email_utils import send_support_auto_reply, notify_support

support_bp = Blueprint("support", __name__)


@support_bp.post("/contact")
def contact():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()
    msg_type = data.get("type", "support")

    if not email or not message:
        return jsonify({"error": "Email and message required"}), 400

    user_name = ""
    if current_user.is_authenticated:
        user_name = current_user.display_name or current_user.email

    # Notify support inbox
    label = "Bug Report" if msg_type == "report" else "Support Request"
    notify_support(
        subject=f"[Pocket Market] {label} from {email}",
        body_html=f"""
        <div style="font-family:sans-serif;padding:16px;">
            <h3>{label}</h3>
            <p><strong>From:</strong> {email} {f'({user_name})' if user_name else ''}</p>
            <p><strong>Message:</strong></p>
            <div style="background:#f5f5f5;padding:12px;border-radius:8px;white-space:pre-wrap;">{message}</div>
        </div>
        """,
    )

    # Auto-reply to user
    send_support_auto_reply(email, msg_type)

    return jsonify({"ok": True}), 200
