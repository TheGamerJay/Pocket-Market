import threading
from flask import current_app
from flask_mail import Message
from extensions import mail


def _send_async(app, msg):
    with app.app_context():
        try:
            mail.send(msg)
        except Exception as e:
            app.logger.error(f"Failed to send email: {e}")


def send_email(to, subject, body_html, body_text=None):
    """Send an email in a background thread so it doesn't block the request."""
    if not current_app.config.get("MAIL_USERNAME"):
        current_app.logger.warning("MAIL_USERNAME not set, skipping email")
        return

    msg = Message(subject=subject, recipients=[to])
    msg.html = body_html
    if body_text:
        msg.body = body_text

    app = current_app._get_current_object()
    thread = threading.Thread(target=_send_async, args=(app, msg))
    thread.start()


def send_welcome(email, display_name):
    name = display_name or "there"
    send_email(
        to=email,
        subject="Welcome to Pocket Market!",
        body_html=f"""
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
            <h2 style="color:#3ee0ff;">Welcome to Pocket Market!</h2>
            <p>Hey {name},</p>
            <p>Thanks for joining Pocket Market! We're excited to have you.</p>
            <p>Here's what you can do:</p>
            <ul>
                <li><strong>Post items</strong> you want to sell</li>
                <li><strong>Browse listings</strong> from people nearby</li>
                <li><strong>Message sellers</strong> and make offers</li>
                <li><strong>Save items</strong> you're interested in</li>
            </ul>
            <p>If you have any questions, just reply to this email or visit our Help & Support page.</p>
            <p>Happy selling!<br><strong>The Pocket Market Team</strong></p>
        </div>
        """,
    )


def send_report_auto_reply(email, display_name, reason, listing_title=None):
    name = display_name or "there"
    item = f' on "{listing_title}"' if listing_title else ""
    send_email(
        to=email,
        subject="We received your report",
        body_html=f"""
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
            <h2 style="color:#3ee0ff;">Report Received</h2>
            <p>Hey {name},</p>
            <p>Thank you for reporting an issue{item}. We take reports seriously and will review it as soon as possible.</p>
            <p><strong>Reason:</strong> {reason}</p>
            <p>We'll take appropriate action if needed. You don't need to do anything else.</p>
            <p>Thanks for helping keep Pocket Market safe!<br><strong>The Pocket Market Team</strong></p>
        </div>
        """,
    )


def send_support_auto_reply(email, message_type):
    label = "report" if message_type == "report" else "message"
    send_email(
        to=email,
        subject="We got your message!",
        body_html=f"""
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
            <h2 style="color:#3ee0ff;">Thanks for reaching out!</h2>
            <p>We received your {label} and will get back to you within 24 hours.</p>
            <p>If it's urgent, you can reply directly to this email.</p>
            <p>Best,<br><strong>The Pocket Market Team</strong></p>
        </div>
        """,
    )


def notify_support(subject, body_html):
    """Send a notification to the support inbox."""
    support_email = current_app.config.get("MAIL_USERNAME", "")
    if not support_email:
        return
    send_email(to=support_email, subject=subject, body_html=body_html)
