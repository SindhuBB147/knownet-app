from __future__ import annotations

import math
from typing import Dict, Iterable, List, Optional, Tuple

from geopy.distance import geodesic
from sqlalchemy.orm import Session

from app.models.user import User

LOCATION_MAP: Dict[str, Tuple[float, float]] = {
    "Bengaluru": (12.9716, 77.5946),
    "Belagavi": (15.8497, 74.4977),
    "Mumbai": (19.0760, 72.8777),
    "Delhi": (28.7041, 77.1025),
    "Chennai": (13.0827, 80.2707),
    "Hyderabad": (17.3850, 78.4867),
}

MAX_DISTANCE_KM = 2000.0


def _get_coordinates(city: Optional[str]) -> Optional[Tuple[float, float]]:
    if not city:
        return None
    return LOCATION_MAP.get(city.strip().title())


def calculate_similarity(user_location: Optional[str], session_location: Optional[str]) -> float:
    user_coords = _get_coordinates(user_location)
    session_coords = _get_coordinates(session_location)

    if not user_coords or not session_coords:
        return 0.0

    distance_km = geodesic(user_coords, session_coords).kilometers
    score = max(0.0, 1 - (distance_km / MAX_DISTANCE_KM))
    return round(score, 4)


def recommend_sessions(
    user_location: Optional[str],
    sessions: Iterable[Dict[str, str]],
) -> List[Dict[str, object]]:
    recommendations: List[Dict[str, object]] = []
    for session in sessions:
        location = session.get("location")
        score = calculate_similarity(user_location, location)
        recommendations.append({**session, "similarity_score": score})

    recommendations.sort(key=lambda item: item["similarity_score"], reverse=True)
    return recommendations


def haversine_km(lat1: Optional[float], lon1: Optional[float], lat2: Optional[float], lon2: Optional[float]) -> Optional[float]:
    if None in {lat1, lon1, lat2, lon2}:
        return None
    lat1_rad, lon1_rad, lat2_rad, lon2_rad = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return round(6371 * c, 2)


def _serialize_user_recommendation(user: User, distance_km: Optional[float]) -> Dict[str, object]:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "location": user.location,
        "city": user.city,
        "state": user.state,
        "latitude": user.latitude,
        "longitude": user.longitude,
        "avatar_url": user.avatar_url,
        "distance_km": None if distance_km is None else round(distance_km, 2),
    }


def recommend_users_by_location(
    db: Session,
    current_user: User,
    users: Iterable[User],
    user_skills: List[str] = [],
    *,
    local_radius_km: float = 50.0,
) -> Dict[str, List[Dict[str, object]]]:
    from app.models.connection import Connection, ConnectionStatus
    
    # Pre-fetch all connections for current user to avoid N+1
    connections = db.query(Connection).filter(
        (Connection.sender_id == current_user.id) | (Connection.receiver_id == current_user.id)
    ).all()
    
    conn_map = {} # target_user_id -> status dict
    for conn in connections:
        if conn.sender_id == current_user.id:
            target_id = conn.receiver_id
            conn_map[target_id] = {
                "status": conn.status,
                "is_sender": True,
                "id": conn.id
            }
        else:
            target_id = conn.sender_id
            conn_map[target_id] = {
                "status": conn.status,
                "is_sender": False,
                "id": conn.id
            }

    scored_items: List[Dict[str, object]] = []
    
    # Normalize current user skills for comparison
    my_skills = {s.lower() for s in user_skills}

    for user in users:
        if user.id == current_user.id:
            continue
            
        # 1. Location Score
        distance_km = haversine_km(current_user.latitude, current_user.longitude, user.latitude, user.longitude)
        same_city = (
            (bool(current_user.city) and bool(user.city) and current_user.city.strip().lower() == user.city.strip().lower())
            or
            (bool(current_user.location) and bool(user.location) and current_user.location.strip().lower() == user.location.strip().lower())
        )

        if distance_km is None and same_city:
            distance_km = 0.0
        
        is_nearby = distance_km is not None and distance_km <= local_radius_km
        
        # 2. Skill Score
        # Assume user.skills is loaded.
        target_skills = {s.name.lower() for s in user.skills}
        shared_skills = my_skills.intersection(target_skills)
        skill_match_count = len(shared_skills)

        # 3. Connection Info
        serialized = _serialize_user_recommendation(user, distance_km)
        conn_info = conn_map.get(user.id)
        if conn_info:
            serialized["connection"] = {
                "status": conn_info["status"].value,
                "is_sender": conn_info["is_sender"],
                "id": conn_info["id"]
            }
        else:
            serialized["connection"] = None
            
        serialized["skill_matches"] = list(shared_skills)
        serialized["shared_count"] = skill_match_count

        # Sorting tuple: 
        # 1. (Primary) Have Shared Skill AND Is Nearby
        # 2. (Secondary) Skill Match Count (High to Low)
        # 3. (Tertiary) Is Nearby (True to False)
        # 4. (Quaternary) Distance (Low to High)
        
        priority_group = 0
        if skill_match_count > 0 and is_nearby:
            priority_group = 3 # Highest
        elif skill_match_count > 0:
            priority_group = 2
        elif is_nearby:
            priority_group = 1
        
        # Store for sorting
        scored_items.append({
            "data": serialized,
            "sort_key": (priority_group, skill_match_count, -(distance_km if distance_km is not None else 99999))
        })

    # Sort descending based on our tuple key
    scored_items.sort(key=lambda x: x["sort_key"], reverse=True)
    
    # Extract sorted data
    final_list = [item["data"] for item in scored_items]

    return {
        "local": [x for x in final_list if (x["distance_km"] is not None and x["distance_km"] <= local_radius_km)], # Legacy support if needed
        "global": final_list, # We just use this sorted list as "combined" or main result
        "combined": final_list,
    }

