"""
CPU-friendly content moderation using keyword matching.
No GPU, no ML, no external APIs — pure string matching.

Checks listing titles, descriptions, and messages for:
  - Prohibited items (weapons, drugs, etc.)
  - Hate speech / slurs
  - Scam patterns (wire transfers, gift cards, etc.)
  - Contact info in listings (phone numbers, emails to bypass platform)

Returns a rejection reason if flagged, or None if clean.
"""

import re

# ── Prohibited items (marketplace policy) ──
PROHIBITED_ITEMS = [
    # Weapons & ammo
    "firearm", "handgun", "rifle", "shotgun", "pistol", "revolver",
    "ammunition", "ammo", "silencer", "suppressor",
    "switchblade", "brass knuckles", "stun gun", "taser",
    # Drugs & paraphernalia
    "cocaine", "heroin", "methamphetamine", "fentanyl", "ecstasy",
    "mdma", "lsd", "marijuana", "cannabis", "weed", "edibles",
    "magic mushrooms", "psilocybin", "crack pipe", "bong", "rolling papers",
    # Stolen / illegal goods
    "stolen", "counterfeit", "fake id", "fake passport", "fake license",
    "social security number", "ssn",
    # Regulated / dangerous
    "explosives", "fireworks", "dynamite",
    "prescription pills", "oxycontin", "xanax", "adderall",
    "human organs", "human remains",
    # Animals (live sale)
    "live animal", "puppy mill", "kitten for sale",
]

# ── Hate speech / slurs ──
HATE_SPEECH = [
    "n1gger", "n1gga", "f4ggot", "f4g", "tr4nny", "r3tard",
    "k1ke", "sp1c", "ch1nk", "w3tback", "g00k",
    # Plain text versions (caught by word-boundary matching)
    "nigger", "nigga", "faggot", "tranny", "retard",
    "kike", "spic", "chink", "wetback", "gook",
    "white power", "heil hitler", "white supremacy",
    "kill all", "death to",
]

# ── Scam patterns ──
SCAM_PATTERNS = [
    "wire transfer", "western union", "moneygram",
    "send gift card", "itunes gift card", "google play gift card",
    "pay before seeing", "deposit required before",
    "cash app me", "venmo me before",
    "nigerian prince", "inheritance fund",
    "guaranteed profit", "double your money",
    "send money first", "pay upfront before meeting",
]

# ── Contact bypass patterns (trying to skip platform messaging) ──
CONTACT_BYPASS = [
    "text me at", "call me at", "hit me up at",
    "whatsapp me", "telegram me", "signal me",
    "email me at", "dm me on instagram", "dm me on snap",
    "my number is", "my phone is",
]


def _normalize(text):
    """Lowercase and collapse whitespace for matching."""
    text = text.lower()
    # Replace common leet-speak
    text = text.replace("@", "a").replace("$", "s").replace("0", "o")
    text = text.replace("1", "i").replace("3", "e").replace("4", "a")
    text = text.replace("5", "s").replace("7", "t").replace("!", "i")
    return re.sub(r"\s+", " ", text).strip()


def _check_list(text, word_list, category):
    """Check if any phrase from word_list appears in text."""
    normalized = _normalize(text)
    for phrase in word_list:
        # Use word boundary matching for single words, substring for phrases
        if " " in phrase:
            if phrase in normalized:
                return category
        else:
            if re.search(r"\b" + re.escape(phrase) + r"\b", normalized):
                return category
    return None


def _check_phone_number(text):
    """Detect phone numbers in listing text (not messages — users may share numbers in chat)."""
    # Match common US phone formats: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, 10+ digits
    patterns = [
        r"\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}",  # (555) 555-5555 etc
        r"\b\d{10,}\b",  # 10+ consecutive digits
    ]
    for p in patterns:
        if re.search(p, text):
            return "contact_bypass"
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
    result = _check_list(combined, PROHIBITED_ITEMS, "prohibited_item")
    if result:
        return {
            "flagged": True,
            "reason": "This listing appears to contain a prohibited item. "
                       "Please review our Prohibited Items policy.",
            "category": result,
        }

    # Check hate speech
    result = _check_list(combined, HATE_SPEECH, "hate_speech")
    if result:
        return {
            "flagged": True,
            "reason": "This content contains language that violates our community guidelines.",
            "category": result,
        }

    # Check scam patterns
    result = _check_list(combined, SCAM_PATTERNS, "scam")
    if result:
        return {
            "flagged": True,
            "reason": "This listing contains language commonly associated with scams. "
                       "Please use in-app messaging for all transactions.",
            "category": result,
        }

    # Check contact bypass in listings (phone/email to dodge platform)
    result = _check_list(combined, CONTACT_BYPASS, "contact_bypass")
    if result:
        return {
            "flagged": True,
            "reason": "Please use Pocket Market messaging instead of sharing "
                       "personal contact info in listings.",
            "category": result,
        }

    # Check phone numbers in listings
    if _check_phone_number(combined):
        return {
            "flagged": True,
            "reason": "Please use Pocket Market messaging instead of sharing "
                       "phone numbers in listings.",
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

    # Check hate speech in messages
    result = _check_list(text, HATE_SPEECH, "hate_speech")
    if result:
        return {
            "flagged": True,
            "reason": "This message contains language that violates our community guidelines.",
            "category": result,
        }

    # Check scam patterns in messages
    result = _check_list(text, SCAM_PATTERNS, "scam")
    if result:
        return {
            "flagged": True,
            "reason": "This message contains content flagged as a potential scam. "
                       "Never send money outside the platform.",
            "category": result,
        }

    return None
