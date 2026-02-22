"""
CPU-friendly content moderation using keyword matching.
No GPU, no ML, no external APIs — pure string matching.

Philosophy: only block truly unambiguous bad content. Single words like
"weed", "ammo", "rifle", "stolen", "edibles" have too many innocent uses
(weed trimmer, ammo cans, nerf rifle, "never stolen", baked goods).
We use multi-word phrases to reduce false positives, and rely on the
report system + admin panel for edge cases.

Returns a rejection reason if flagged, or None if clean.
"""

import re

# ── Prohibited items (multi-word phrases only — no ambiguous single words) ──
PROHIBITED_ITEMS = [
    # Drugs — only unambiguous phrases
    "selling cocaine", "selling heroin", "selling meth",
    "buy cocaine", "buy heroin", "buy meth",
    "selling fentanyl", "buy fentanyl",
    "for sale cocaine", "for sale heroin",
    # Stolen goods
    "selling stolen", "buy stolen", "stolen goods",
    # Fake IDs
    "fake id for sale", "fake passport", "fake license for sale",
    "fake drivers license", "buy fake id",
    # Human trafficking / organs
    "human organs for sale", "selling human remains",
    # Puppy mills
    "puppy mill",
]

# ── Hate speech / slurs (these have no innocent use) ──
HATE_SPEECH = [
    "nigger", "nigga", "faggot", "tranny",
    "kike", "spic", "chink", "wetback", "gook",
    "white power", "heil hitler", "white supremacy",
    "kill all", "death to all",
]

# ── Scam patterns (multi-word phrases — very specific) ──
SCAM_PATTERNS = [
    "wire transfer only", "western union only",
    "send gift card", "pay with gift card",
    "pay before seeing", "deposit required before meeting",
    "send money first", "pay upfront before meeting",
    "nigerian prince", "inheritance fund",
    "guaranteed profit", "double your money",
]

# ── Contact bypass patterns (trying to skip platform messaging) ──
CONTACT_BYPASS = [
    "text me at", "call me at", "hit me up at",
    "whatsapp me", "telegram me",
    "email me at", "dm me on instagram", "dm me on snap",
    "my number is", "my phone is",
]


def _normalize(text):
    """Lowercase and collapse whitespace for matching."""
    text = text.lower()
    # Replace common leet-speak (only for hate speech check)
    return re.sub(r"\s+", " ", text).strip()


def _normalize_leet(text):
    """Additional leet-speak normalization for hate speech only."""
    text = _normalize(text)
    text = text.replace("@", "a").replace("$", "s").replace("0", "o")
    text = text.replace("1", "i").replace("3", "e").replace("4", "a")
    text = text.replace("5", "s").replace("7", "t").replace("!", "i")
    return text


def _check_phrases(text, phrase_list, use_leet=False):
    """Check if any phrase from the list appears in text."""
    normalized = _normalize_leet(text) if use_leet else _normalize(text)
    for phrase in phrase_list:
        if phrase in normalized:
            return phrase
    return None


def check_listing_content(title, description=None):
    """
    Check listing title and description for prohibited content.
    Returns dict with 'flagged' bool and 'reason' string, or None if clean.
    """
    combined = title or ""
    if description:
        combined += " " + description

    if not combined.strip():
        return None

    # Check prohibited items
    match = _check_phrases(combined, PROHIBITED_ITEMS)
    if match:
        return {
            "flagged": True,
            "reason": "This listing appears to contain a prohibited item. "
                       "Please review our Prohibited Items policy.",
            "category": "prohibited_item",
        }

    # Check hate speech (with leet-speak normalization)
    match = _check_phrases(combined, HATE_SPEECH, use_leet=True)
    if match:
        return {
            "flagged": True,
            "reason": "This content contains language that violates our community guidelines.",
            "category": "hate_speech",
        }

    # Check scam patterns
    match = _check_phrases(combined, SCAM_PATTERNS)
    if match:
        return {
            "flagged": True,
            "reason": "This listing contains language commonly associated with scams. "
                       "Please use in-app messaging for all transactions.",
            "category": "scam",
        }

    # Check contact bypass in listings
    match = _check_phrases(combined, CONTACT_BYPASS)
    if match:
        return {
            "flagged": True,
            "reason": "Please use Pocket Market messaging instead of sharing "
                       "personal contact info in listings.",
            "category": "contact_bypass",
        }

    return None


def check_message_content(text):
    """
    Check message text for harmful content (lighter filter — no contact bypass check).
    Returns dict with 'flagged' bool and 'reason' string, or None if clean.
    """
    if not text or not text.strip():
        return None

    # Check hate speech in messages (with leet-speak normalization)
    match = _check_phrases(text, HATE_SPEECH, use_leet=True)
    if match:
        return {
            "flagged": True,
            "reason": "This message contains language that violates our community guidelines.",
            "category": "hate_speech",
        }

    # Check scam patterns in messages
    match = _check_phrases(text, SCAM_PATTERNS)
    if match:
        return {
            "flagged": True,
            "reason": "This message contains content flagged as a potential scam. "
                       "Never send money outside the platform.",
            "category": "scam",
        }

    return None
