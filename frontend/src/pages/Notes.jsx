import { useState } from "react";
import { notesApi } from "../api/api";
import { useAuth } from "../context/AuthContext";

export const Notes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState(() => notesApi.list(user?.id));
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");

  if (!user) return null;

  const sync = () => setNotes(notesApi.list(user.id));

  const handleAdd = (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    notesApi.create(user.id, { title: title.trim(), content: text.trim() });
    setTitle("");
    setText("");
    sync();
  };

  const handleDelete = (id) => {
    notesApi.remove(user.id, id);
    sync();
  };

  return (
    <div className="page">
      <div className="card">
        <h2>Private notes</h2>
        <form className="form-grid" onSubmit={handleAdd}>
          <div className="form-control">
            <label htmlFor="note-title">Title</label>
            <input id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="form-control">
            <label htmlFor="note-body">Content</label>
            <textarea id="note-body" rows="4" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit">
            Save note
          </button>
        </form>
      </div>

      <div className="grid grid-3">
        {notes.map((note) => (
          <article key={note.id} className="card">
            <h4>{note.title}</h4>
            <p>{note.content || "No content"}</p>
            <small>{new Date(note.createdAt).toLocaleString()}</small>
            <button className="btn btn-secondary" onClick={() => handleDelete(note.id)}>
              Delete
            </button>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Notes;

