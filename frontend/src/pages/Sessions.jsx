import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { api, sessionApi } from "../api/api";
import SessionCard from "../components/SessionCard";
import { useAuth } from "../context/AuthContext";

const defaultValues = {
  title: "",
  description: "",
  date: "",
  time: "",
  location: "",
};

export const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendedSessions, setRecommendedSessions] = useState([]);
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues });

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await sessionApi.list();
      setSessions(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    let loc = storedUser?.location;
    if (!loc) {
      const fallback = localStorage.getItem("knownet_user");
      if (fallback) {
        const parsed = JSON.parse(fallback);
        loc = parsed?.location;
      }
    }
    if (!loc) {
      return;
    }
    api
      .get(`/recommend/${encodeURIComponent(loc)}`)
      .then((res) => {
        setRecommendedSessions(res.data || []);
      })
      .catch(() => setRecommendedSessions([]));
  }, []);

  const onCreateSession = async (values) => {
    await sessionApi.create(values);
    reset(defaultValues);
    await loadSessions();
  };

  return (
    <div className="page">
      {recommendedSessions.length > 0 && (
        <div className="card">
          <h2>Recommended For You (Based on Your Location)</h2>
          {recommendedSessions.map((rec) => {
            const detailedSession = sessions.find((session) => session.id === rec.session_id);
            const fallbackSession = {
              id: rec.session_id,
              title: rec.title,
              description: detailedSession?.description || "Location-matched session",
              date: detailedSession?.date,
              time: detailedSession?.time,
              location: rec.location,
              created_by: detailedSession?.created_by,
            };
            const similarityScore =
              typeof rec.similarity_score === "number" ? rec.similarity_score : 0;
            return (
              <div key={rec.session_id}>
                <SessionCard
                  session={detailedSession || fallbackSession}
                  onJoin={() => sessionApi.join(rec.session_id).then(loadSessions)}
                  onView={(id) => navigate(`/sessions/${id}`)}
                  isMentor={(detailedSession || fallbackSession)?.created_by === authUser?.id}
                />
                <div className="status-pill info">Similarity {(similarityScore * 100).toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      )}
      <div className="card">
        <h2>Upcoming sessions</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onJoin={() => sessionApi.join(session.id).then(loadSessions)}
              onView={(id) => navigate(`/sessions/${id}`)}
              isMentor={session.created_by === authUser?.id}
            />
          ))
        )}
        {!loading && !sessions.length && <p>No sessions scheduled.</p>}
      </div>
      {user?.role === "mentor" && (
        <div className="card">
          <h3>Create a session</h3>
          <form className="form-grid" onSubmit={handleSubmit(onCreateSession)}>
            <div className="form-control">
              <label htmlFor="title">Title</label>
              <input id="title" {...register("title", { required: "Title is required" })} />
              {errors.title && <small className="error">{errors.title.message}</small>}
            </div>
            <div className="form-control">
              <label htmlFor="description">Description</label>
              <textarea id="description" rows="3" {...register("description", { required: "Description is required" })} />
              {errors.description && <small className="error">{errors.description.message}</small>}
            </div>
            <div className="form-control">
              <label htmlFor="date">Date</label>
              <input id="date" type="date" {...register("date", { required: true })} />
            </div>
            <div className="form-control">
              <label htmlFor="time">Time</label>
              <input id="time" type="time" {...register("time", { required: true })} />
            </div>
            <div className="form-control">
              <label htmlFor="location">Location</label>
              <input id="location" {...register("location", { required: true })} />
            </div>
            <button className="btn btn-primary" type="submit">
              Publish Session
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Sessions;

