import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectionApi } from "../api/api";

export const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await connectionApi.listRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAccept = async (connectionId) => {
    try {
      const result = await connectionApi.accept(connectionId);
      navigate(`/chat/${result.connection_id}`);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to accept request.");
    }
  };

  const handleReject = async (connectionId) => {
    try {
      await connectionApi.reject(connectionId);
      setRequests((prev) => prev.filter((req) => req.id !== connectionId));
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to reject request.");
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card__header">
          <h2>Connection requests</h2>
          <button className="btn btn-secondary" onClick={loadRequests}>
            Refresh
          </button>
        </div>
        {loading && <p>Loading...</p>}
        {error && <p className="text-error">{error}</p>}
        {!loading && !requests.length && <p>No pending requests right now.</p>}
        {!loading &&
          requests.map((request) => (
            <div key={request.id} className="request-row">
              <div>
                <strong>{request.sender?.name || request.sender?.email || `User #${request.sender_id}`}</strong>
                <p className="request-meta">Wants to connect with you</p>
              </div>
              <div className="request-actions">
                <button className="btn btn-primary" onClick={() => handleAccept(request.id)}>
                  Accept & Chat
                </button>
                <button className="btn btn-danger" onClick={() => handleReject(request.id)} style={{ marginLeft: "10px", backgroundColor: "#dc3545", color: "white" }}>
                  Reject
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Requests;

