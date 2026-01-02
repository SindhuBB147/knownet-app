import { useEffect, useState } from "react";
import { resourceApi, sessionApi } from "../api/api";
import { useAuth } from "../context/AuthContext";

export const Resources = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [resources, setResources] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await sessionApi.list();
      setSessions(data);
      if (data.length) {
        setSelectedSession(String(data[0].id));
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedSession) return;
    resourceApi.list(selectedSession).then(setResources);
  }, [selectedSession]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedSession) return;
    setUploading(true);
    try {
      await resourceApi.upload(selectedSession, file);
      const updated = await resourceApi.list(selectedSession);
      setResources(updated);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h2>Session resources</h2>
        <div className="form-control">
          <label htmlFor="session-select">Session</label>
          <select id="session-select" value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title}
              </option>
            ))}
          </select>
        </div>
        {user?.role === "mentor" && (
          <label className="btn btn-secondary">
            {uploading ? "Uploading..." : "Upload resource"}
            <input type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.ppt,.pptx" onChange={handleUpload} />
          </label>
        )}
      </div>

      <div className="card">
        {resources.length ? (
          <ul>
            {resources.map((resource) => (
              <li key={resource.id}>
                <a href={resource.file_url} target="_blank" rel="noreferrer">
                  {resource.file_name}
                </a>
                <span> • {new Date(resource.uploaded_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No resources uploaded for this session.</p>
        )}
      </div>
    </div>
  );
};

export default Resources;

