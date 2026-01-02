import { useEffect, useState } from "react";
import { connectionApi, recommendationApi, sessionApi } from "../api/api";
import SessionCard from "../components/SessionCard";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export const Dashboard = () => {
  const { user, updateUserLocation } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(true);
  const [recError, setRecError] = useState("");
  const [recommendations, setRecommendations] = useState({ local: [], global: [], combined: [] });
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (
            Math.abs(latitude - (user.latitude || 0)) > 0.0001 ||
            Math.abs(longitude - (user.longitude || 0)) > 0.0001
          ) {
            updateUserLocation(latitude, longitude);
          }
        },
        (error) => {
          console.log("Location access denied or unavailable:", error);
        },
        { timeout: 10000 }
      );
    }
  }, [user?.id, updateUserLocation, user?.latitude, user?.longitude]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await sessionApi.list({ location: user?.location });
        setSessions(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.location]);

  useEffect(() => {
    if (!user?.id) return;
    const loadRecommendations = async () => {
      console.log("[Dashboard] Starting loadRecommendations...");
      setRecLoading(true);
      setRecError("");
      try {
        console.log("[Dashboard] Calling recommendationApi.location()...");
        const data = await recommendationApi.location();
        console.log("[Dashboard] Rceived data:", data);
        setRecommendations(data);
      } catch (error) {
        console.error("[Dashboard] Failed to load recommendations", error);
        setRecError(error?.response?.data?.detail || error?.message || "Unable to load recommendations.");
      } finally {
        setRecLoading(false);
      }
    };
    loadRecommendations();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const check = async () => {
      try {
        const response = await connectionApi.check();
        if (response.redirect_to_chat && response.connection_id) {
          navigate(`/chat/${response.connection_id}`);
        }
      } catch (error) {
        console.error("[Dashboard] Failed to check connections", error);
      }
    };
    check();
  }, [navigate, user?.id]);

  const formatDistance = (distance) => {
    if (distance == null) {
      return "Distance unavailable";
    }
    return `${distance.toFixed(1)} km away`;
  };

  const handleConnect = async (targetId) => {
    try {
      await connectionApi.request(targetId);
      alert("Connection request sent!");
    } catch (error) {
      console.error("[Dashboard] Failed to send connection request", error);
      alert(error?.response?.data?.detail || error?.message || "Unable to send connection request.");
    }
  };

  const renderRecommendations = (items, emptyLabel) => {
    if (!items.length) {
      return <p>{emptyLabel}</p>;
    }
    return (
      <ul className="recommendation-list">
        {items.map((person) => (
          <li key={person.id} className="recommendation-item">
            <div>
              <strong>{person.name}</strong>
              <p className="recommendation-meta">
                {(person.city && person.state && `${person.city}, ${person.state}`) ||
                  person.city ||
                  person.location ||
                  "Location unknown"}
              </p>
            </div>
            <div className="recommendation-actions">
              <span>{formatDistance(person.distance_km)}</span>
              <button className="btn btn-secondary btn-compact" onClick={() => handleConnect(person.id)}>
                Connect
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  if (!user) {
    return null;
  }

  return (
    <div className="page">
      <div className="card">
        <h2>Welcome back, {user.name}</h2>
        <p>
          Role: <strong>{user.role}</strong> • Location: <strong>{user.location || "Global"}</strong>
        </p>
      </div>
      <div className="card">
        <div className="card__header">
          <h3>Recommended sessions near you</h3>
          <button className="btn btn-secondary" onClick={() => navigate("/sessions")}>
            View all
          </button>
        </div>
        {loading ? (
          <p>Loading sessions...</p>
        ) : sessions.length ? (
          sessions.slice(0, 3).map((session) => (
            <SessionCard key={session.id} session={session} onView={(id) => navigate(`/sessions/${id}`)} />
          ))
        ) : (
          <p>No sessions yet. Check back soon!</p>
        )}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card__header">
            <h3>Users near you</h3>
            <small>Top {Math.min(10, recommendations.local.length || 0)} matches</small>
          </div>
          {recLoading ? (
            <p>Loading nearby mentors and peers...</p>
          ) : recError ? (
            <p className="text-error">{recError}</p>
          ) : (
            renderRecommendations(recommendations.local.slice(0, 10), "No nearby users yet.")
          )}
        </div>
        <div className="card">
          <div className="card__header">
            <h3>Other KnowNet users</h3>
            <small>Global community</small>
          </div>
          {recLoading ? (
            <p>Loading community members...</p>
          ) : recError ? (
            <p className="text-error">{recError}</p>
          ) : (
            renderRecommendations(recommendations.global.slice(0, 10), "No global users to suggest yet.")
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

