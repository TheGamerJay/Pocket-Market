from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from extensions import db
from models import SavedSearch

saved_searches_bp = Blueprint("saved_searches", __name__)


@saved_searches_bp.get("")
@login_required
def get_saved():
    rows = SavedSearch.query.filter_by(user_id=current_user.id).order_by(SavedSearch.created_at.desc()).all()
    return jsonify({"saved_searches": [
        {"id": s.id, "query": s.query, "category": s.category, "created_at": s.created_at.isoformat()}
        for s in rows
    ]}), 200


@saved_searches_bp.post("")
@login_required
def save_search():
    data = request.get_json(force=True)
    q = (data.get("query") or "").strip()
    category = (data.get("category") or "").strip() or None

    if not q:
        return jsonify({"error": "Query required"}), 400

    existing = SavedSearch.query.filter_by(user_id=current_user.id, query=q).first()
    if existing:
        return jsonify({"error": "Already saved"}), 409

    s = SavedSearch(user_id=current_user.id, query=q, category=category)
    db.session.add(s)
    db.session.commit()
    return jsonify({"ok": True, "id": s.id}), 201


@saved_searches_bp.delete("/<search_id>")
@login_required
def delete_saved(search_id):
    s = db.session.get(SavedSearch, search_id)
    if not s:
        return jsonify({"error": "Not found"}), 404
    if s.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403
    db.session.delete(s)
    db.session.commit()
    return jsonify({"ok": True}), 200
