import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, connectionApi, meetingApi, messageApi, sessionApi } from "../api/api";
import { useAuth } from "../context/AuthContext";

const VideoCameraIcon = ({ className = "", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M15 8.25H4.5c-.621 0-1.125.504-1.125 1.125v5.25c0 .621.504 1.125 1.125 1.125H15c.621 0 1.125-.504 1.125-1.125v-1.069l3.008 1.505a.75.75 0 001.092-.67V9.609a.75.75 0 00-1.092-.67l-3.008 1.505V9.375c0-.621-.504-1.125-1.125-1.125z" />
  </svg>
);

export const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { connectionId } = useParams();

  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // Connection / Sidebar State
  const [connections, setConnections] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fileHost = useMemo(() => {
    const override = import.meta.env?.VITE_PUBLIC_FILE_HOST;
    const fallback = api.defaults.baseURL || "http://localhost:8000";
    return (override || fallback).replace(/\/$/, "");
  }, []);

  // Load Sessions (Legacy support if needed, though we prioritize connections now)
  useEffect(() => {
    // Only load sessions if NOT in a connection chat, or always? 
    // Let's keep it simple and just load active connections for the sidebar.
    connectionApi.listActive().then(setConnections).catch(console.error);
  }, []);

  // Polling for Messages
  useEffect(() => {
    if (!connectionId) {
      setMessages([]);
      return;
    }

    const loadMessages = () => {
      messageApi.listConnection(connectionId)
        .then(setMessages)
        .catch(console.error);
    };

    // Initial load
    loadMessages();

    // Poll every 3 seconds
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [connectionId]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!input.trim() || !connectionId) return;

    try {
      await messageApi.sendConnection(connectionId, { content: input.trim() });
      const refreshed = await messageApi.listConnection(connectionId);
      setMessages(refreshed);
      setInput("");
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleVideoClick = () => {
    if (!connectionId) return;
    navigate(`/meeting/${connectionId}`);
  };

  const handleConnectionSelect = (id) => {
    navigate(`/chat/${id}`);
  };

  const getOtherUser = (connection) => {
    if (!connection) return { name: 'Unknown' };
    return connection.sender_id === user?.id ? connection.receiver : connection.sender;
  };

  const filteredConnections = connections.filter(conn => {
    const other = getOtherUser(conn);
    return other.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const currentConnection = connections.find(c => c.id === Number(connectionId));
  const currentOtherUser = currentConnection ? getOtherUser(currentConnection) : null;

  return (
    <div className="page chat-page" style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 100px)' }}>
      {/* Sidebar */}
      <div className="card" style={{ width: '300px', padding: '0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ marginBottom: '10px', marginTop: 0 }}>Messages</h3>
          <input
            placeholder="Search people or chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filteredConnections.length === 0 && <p style={{ padding: '15px', color: '#666' }}>No chats found</p>}
          {filteredConnections.map(conn => {
            const other = getOtherUser(conn);
            const isActive = Number(connectionId) === conn.id;
            return (
              <div
                key={conn.id}
                onClick={() => handleConnectionSelect(conn.id)}
                style={{
                  padding: '15px',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#f0f2f5' : 'transparent',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div style={{ width: '40px', height: '40px', background: '#ccc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                  {other.name?.[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{other.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>Tap to chat</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {!connectionId ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: '#888' }}>
            <VideoCameraIcon style={{ width: '64px', height: '64px', marginBottom: '20px', opacity: 0.2 }} />
            <h3>Select a chat to start messaging</h3>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
              <h3 style={{ margin: 0 }}>
                {currentOtherUser?.name || 'Chat'}
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleVideoClick}
                  title="Start Video Call"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <VideoCameraIcon style={{ width: '20px', height: '20px' }} />
                  Video
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-thread" style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#e5ddd5', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {messages.length === 0 && <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>No messages yet. Say hello!</p>}
              {messages.map((message) => {
                const isMe = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      backgroundColor: isMe ? '#dcf8c6' : '#fff',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      maxWidth: '70%',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: '0.95rem', color: '#303030' }}>{message.content}</div>
                    <div style={{ fontSize: '0.7rem', color: '#999', textAlign: 'right', marginTop: '4px' }}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <form
              className="chat-input"
              onSubmit={handleSend}
              style={{ padding: '15px', background: '#f0f0f0', borderTop: '1px solid #ddd', display: 'flex', gap: '10px' }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ccc', outline: 'none' }}
              />
              <button
                className="btn btn-primary"
                type="submit"
                style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ➤
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
