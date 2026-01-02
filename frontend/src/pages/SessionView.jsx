import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { attendanceApi, messageApi, recordingApi, resourceApi, sessionApi } from "../api/api";
import { useAuth } from "../context/AuthContext";

export const SessionView = () => {
  const { sessionId } = useParams();
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [resources, setResources] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const isMentor = session?.created_by === user?.id;
  const isAttendee = useMemo(
    () => isMentor || attendance.some((entry) => entry.user.id === user?.id),
    [attendance, isMentor, user?.id],
  );

  const loadSession = async () => {
    const data = await sessionApi.getById(sessionId);
    setSession(data);
  };

  const loadChat = async () => {
    const data = await messageApi.list(sessionId);
    setMessages(data);
  };

  const loadAttendance = async () => {
    const data = await attendanceApi.list(sessionId);
    setAttendance(data);
  };

  const loadResources = async () => {
    const data = await resourceApi.list(sessionId);
    setResources(data);
  };

  const bootstrap = async () => {
    await Promise.all([loadSession(), loadChat(), loadAttendance(), loadResources()]);
  };

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleJoin = async () => {
    await sessionApi.join(sessionId);
    await loadAttendance();
  };

  const handleUploadRecording = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await recordingApi.upload(sessionId, file);
      await loadSession();
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!chatInput.trim()) return;
    await messageApi.send(sessionId, { content: chatInput.trim() });
    setChatInput("");
    await loadChat();
  };

  if (!session) {
    return <div className="page">Loading session...</div>;
  }

  return (
    <div className="page">
      <div className="card">
        <h2>{session.title}</h2>
        <p>{session.description}</p>
        <p>
          Location: <strong>{session.location}</strong>
        </p>
        <div className="session-actions">
          {!isAttendee && (
            <button className="btn btn-primary" onClick={handleJoin}>
              Join session
            </button>
          )}
          {isAttendee && <span className="status-pill success">You are in this session</span>}
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h3>Recording</h3>
          {session.recording_url && isAttendee ? (
            <video width="100%" controls src={session.recording_url} />
          ) : (
            <p>{isAttendee ? "No recording uploaded yet." : "Join the session to access recordings."}</p>
          )}
          {isMentor && (
            <label className="btn btn-secondary">
              {uploading ? "Uploading..." : "Upload recording"}
              <input type="file" accept="video/*" hidden onChange={handleUploadRecording} />
            </label>
          )}
        </div>

        <div className="card">
          <h3>Attendance</h3>
          {attendance.length ? (
            <ul>
              {attendance.map((entry) => (
                <li key={entry.user.id}>
                  {entry.user.name} • {entry.user.location}
                </li>
              ))}
            </ul>
          ) : (
            <p>No attendees yet.</p>
          )}
        </div>

        <div className="card">
          <h3>Resources</h3>
          {resources.length ? (
            <ul>
              {resources.map((resource) => (
                <li key={resource.id}>
                  <a href={resource.file_url} target="_blank" rel="noreferrer">
                    {resource.file_name}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>Resources will appear here.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Live chat</h3>
        <div className="chat-thread">
          {messages.map((message) => (
            <div key={message.id} className="chat-message">
              <strong>{message.sender_id === user?.id ? "You" : `User ${message.sender_id}`}</strong>
              <p>{message.content}</p>
              <small>{new Date(message.timestamp).toLocaleString()}</small>
            </div>
          ))}
        </div>
        {isAttendee ? (
          <form className="chat-input" onSubmit={handleSendMessage}>
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Share an update..." />
            <button className="btn btn-primary" type="submit">
              Send
            </button>
          </form>
        ) : (
          <p>Join to participate in chat.</p>
        )}
      </div>
    </div>
  );
};

export default SessionView;

