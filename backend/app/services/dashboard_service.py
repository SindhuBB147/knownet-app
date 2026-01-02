from collections import Counter
from datetime import datetime
from typing import Dict, List
from sqlalchemy import or_

from app.models.session import Session as SessionModel
from app.models.user import User
from app.models.user_skill import UserSkill
from app.services import notification_service, profile_service, recommendation_service, session_service, skill_service


def get_dashboard_overview(db, *, user: User) -> Dict:
    profile = profile_service.get_profile(db, user)
    skills = skill_service.list_skills(db, user=user)
    sessions = session_service.list_sessions(db)
    created_sessions = session_service.list_sessions_created_by_user(db, user)
    joined_sessions = session_service.list_sessions_joined_by_user(db, user)
    notifications = notification_service.list_notifications(db, user=user, limit=50)

    joined_session_ids = {session.id for session in created_sessions}
    for session in joined_sessions:
        joined_session_ids.add(session.id)

    recommendations = _build_recommendations(user, sessions)
    trending_skills = _build_trending_skills(sessions, skills)
    upcoming_sessions = _build_upcoming_sessions(sessions)
    communities = _serialize_communities(
        [s for s in sessions if s.id in joined_session_ids],
        owned_ids={session.id for session in created_sessions},
    )
    feed_items = _build_feed_items(communities, user)

    today = datetime.utcnow()
    # Get User Recommendations (People)
    # Eager load skills if not already to optimize
    other_users = db.query(User).filter(User.id != user.id).all()
    user_skill_names = [s.name for s in skills]
    user_recs = recommendation_service.recommend_users_by_location(
        db, user, other_users, user_skills=user_skill_names
    )

    overview = {
        "user": {
            "name": user.name,
            "location": user.location,
            "role": user.role,
            "avatar_url": user.avatar_url,
            "profile_completion": _calculate_profile_completion(user, profile, skills),
        },
        "skills": {
            "quick_links": _build_quick_links(skills, trending_skills),
            "personal": [_serialize_skill(skill) for skill in skills],
        },
        "recommendations": recommendations[:3],
        "users_near_you": user_recs["combined"][:5],  # Priority: Local -> Global
        "trending_skills": trending_skills,
        "upcoming_sessions": upcoming_sessions[:4],
        "communities": communities[:4],
        "notifications": [_serialize_notification(notification) for notification in notifications],
        "feed": feed_items[:4],
        "stats": {
            "total_sessions": len(sessions),
            "joined_sessions": len(joined_session_ids),
            "skills_count": len(skills),
        },
    }
    return overview


def search_general(db, *, query: str) -> Dict:
    query = query.strip().lower()
    if not query:
        return {"users": [], "skills": [], "sessions": []}

    # 1. Search Users (Name or Location)
    # Note: SQLite LIKE is case-insensitive for ASCII, but we use ilike for Postgres compatibility if needed, 
    # though here standard like with lower input covers basics.
    users = db.query(User).filter(
        or_(
            User.name.ilike(f"%{query}%"),
            User.location.ilike(f"%{query}%")
        )
    ).limit(10).all()

    # 2. Search Skills
    # Join with User to show who possesses the skill
    skills_query = db.query(UserSkill).join(User).filter(
        UserSkill.name.ilike(f"%{query}%")
    ).limit(10).all()

    # 3. Search Sessions
    sessions = db.query(SessionModel).filter(
        or_(
            SessionModel.title.ilike(f"%{query}%"),
            SessionModel.description.ilike(f"%{query}%")
        )
    ).limit(10).all()

    results = {
        "users": [_serialize_user_search(u) for u in users],
        "skills": [
            {
                "skill": s.name, 
                "user": _serialize_user_search(s.user),
                "level": s.level
            } for s in skills_query
        ],
        "sessions": [_serialize_session(s) for s in sessions]
    }
    return results



def _build_quick_links(skills: List[UserSkill], trending: List[Dict]) -> List[str]:
    # Use a set to track seen skills to avoid duplicates
    seen = set()
    quick_links = []
    
    # Add user's own skills first
    for skill in skills:
        if skill.name not in seen:
            seen.add(skill.name)
            quick_links.append(skill.name)
            
    # Fill remaining slots with trending skills
    remaining = 6 - len(quick_links)
    if remaining > 0:
        for item in trending:
            label = item["label"]
            if label not in seen:
                seen.add(label)
                quick_links.append(label)
                if len(quick_links) >= 6:
                    break
                    
    return quick_links or ["AI", "Web Development", "Design"]


def _build_recommendations(user: User, sessions: List[SessionModel]) -> List[Dict]:
    payload = [
        {"session_id": session.id, "title": session.title, "location": session.location}
        for session in sessions
    ]
    recommendations = recommendation_service.recommend_sessions(user.location, payload)
    session_lookup = {session.id: session for session in sessions}
    results: List[Dict] = []
    for recommendation in recommendations:
        session = session_lookup.get(recommendation["session_id"])
        if not session:
            continue
        results.append(
            {
                **_serialize_session(session),
                "match_score": recommendation["similarity_score"],
                "category": _categorize_session(session)["label"],
            }
        )
    return results


def _build_trending_skills(sessions: List[SessionModel], user_skills: List[UserSkill]) -> List[Dict]:
    counter = Counter()
    for session in sessions:
        category = _categorize_session(session)
        counter[category["label"]] += 1
    for skill in user_skills:
        counter[skill.name] += 1
    trending = [{"label": label, "count": count} for label, count in counter.most_common(10)]
    if trending:
        return trending
    return [
        {"label": "Generative AI", "count": 5},
        {"label": "Product Design", "count": 3},
        {"label": "Cloud", "count": 2},
    ]


def _build_upcoming_sessions(sessions: List[SessionModel]) -> List[Dict]:
    future_sessions = sorted(
        sessions,
        key=lambda s: (s.date, s.time),
    )
    return [_serialize_session(session) for session in future_sessions]


def _build_feed_items(communities: List[Dict], user: User) -> List[Dict]:
    feed: List[Dict] = []
    for community in communities:
        feed.append(
            {
                "title": f"New discussion in {community['title']}",
                "meta": f"{community['location']} • Hosted by {'you' if community.get('owned') else 'community mentor'}",
                "session_id": community["id"],
            }
        )
    if not feed:
        feed = [
            {
                "title": "Share your wins with the community",
                "meta": f"{user.location} • KnowNet Community",
                "session_id": None,
            }
        ]
    return feed


def _categorize_session(session: SessionModel) -> Dict:
    title = (session.title or "").lower()
    description = (session.description or "").lower()
    text = f"{title} {description}"
    if any(keyword in text for keyword in ["design", "ux", "ui", "figma", "illustrator"]):
        return {"key": "design", "label": "Design", "icon": "fas fa-palette"}
    if any(keyword in text for keyword in ["data", "analysis", "analytics", "ai", "ml", "python", "sql"]):
        return {"key": "data", "label": "Data & AI", "icon": "fas fa-database"}
    if any(keyword in text for keyword in ["health", "fitness", "yoga", "wellness"]):
        return {"key": "health", "label": "Health & Fitness", "icon": "fas fa-heartbeat"}
    if any(keyword in text for keyword in ["music", "art", "creative", "photography"]):
        return {"key": "arts", "label": "Arts & Music", "icon": "fas fa-music"}
    if any(keyword in text for keyword in ["business", "marketing", "sales", "startup"]):
        return {"key": "business", "label": "Business", "icon": "fas fa-briefcase"}
    return {"key": "tech", "label": "Technology", "icon": "fas fa-laptop-code"}


def _serialize_skill(skill: UserSkill) -> Dict:
    return {
        "id": skill.id,
        "name": skill.name,
        "level": skill.level,
    }


def _serialize_session(session: SessionModel) -> Dict:
    start_dt = session.start_time if hasattr(session, "start_time") else None
    date_label = session.date.strftime("%b %d") if session.date else None
    time_label = session.time.strftime("%H:%M") if session.time else None
    return {
        "id": session.id,
        "title": session.title,
        "description": session.description,
        "location": session.location or "Remote",
        "date_label": date_label,
        "time_label": time_label,
        "start_time": start_dt.isoformat() if start_dt else None,
    }


def _serialize_communities(sessions: List[SessionModel], owned_ids: set[int]) -> List[Dict]:
    serialized = []
    for session in sessions:
        data = _serialize_session(session)
        data["owned"] = session.id in owned_ids
        serialized.append(data)
    return serialized


def _serialize_notification(notification) -> Dict:
    return {
        "id": notification.id,
        "title": notification.title,
        "body": notification.body,
        "type": notification.type.value,
        "created_at": notification.created_at.isoformat(),
        "read": notification.read_at is not None,
    }


def _calculate_profile_completion(user: User, profile, skills: List[UserSkill]) -> float:
    total_sections = 4
    completed = 0
    if user.name:
        completed += 1
    if user.location:
        completed += 1
    if profile and profile.bio:
        completed += 1
    if skills:
        completed += 1
    return completed / total_sections


def _serialize_user_search(user: User) -> Dict:
    return {
        "id": user.id,
        "name": user.name,
        "location": user.location,
        "avatar_url": user.avatar_url,
        "role": user.role,
    }


