import { format } from "date-fns";

export const SessionCard = ({ session, onJoin, onView, isMentor }) => {
  const startTime = session.date && session.time ? new Date(`${session.date}T${session.time}`) : null;

  return (
    <div className="card session-card">
      <div className="session-card__header">
        <div>
          <h3>{session.title}</h3>
          <p>{session.description}</p>
        </div>
        <span className="status-pill info">{session.location}</span>
      </div>
      <div className="session-card__meta">
        <div>
          <small>Date</small>
          <strong>{startTime ? format(startTime, "PPP") : "TBD"}</strong>
        </div>
        <div>
          <small>Time</small>
          <strong>{startTime ? format(startTime, "p") : "TBD"}</strong>
        </div>
        <div>
          <small>Mentor</small>
          <strong>{session.created_by}</strong>
        </div>
      </div>
      <div className="session-card__actions">
        {onJoin && (
          <button className="btn btn-primary" onClick={() => onJoin(session.id)}>
            Join Session
          </button>
        )}
        {onView && (
          <button className="btn btn-secondary" onClick={() => onView(session.id)}>
            View Session
          </button>
        )}
        {isMentor && (
          <span className="status-pill success" title="You created this session">
            Mentor
          </span>
        )}
      </div>
    </div>
  );
};

export default SessionCard;

