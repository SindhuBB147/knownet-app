# Knownet Platform

A full-stack learning platform for students and mentors.

---

## 🚀 Tech Stack
- **Frontend:** React, Axios, React Router
- **Backend:** FastAPI, Python, SQLAlchemy, JWT Auth
- **Database:** MySQL
- **Storage:** Local directories for recordings & shared resources

---

## 📁 Project Structure

```
Mini Project/
├── README.md
├── backend/
│   ├── README.md
│   ├── app/
│   │   ├── __init__.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── attendance_api.py
│   │   │   ├── auth_api.py
│   │   │   ├── message_api.py
│   │   │   ├── recording_api.py
│   │   │   ├── resource_api.py
│   │   │   └── session_api.py
│   │   ├── main.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── attendance.py
│   │   │   ├── message.py
│   │   │   ├── resource.py
│   │   │   ├── session.py
│   │   │   └── user.py
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── attendance_service.py
│   │       ├── auth_service.py
│   │       ├── message_service.py
│   │       ├── recording_service.py
│   │       ├── resource_service.py
│   │       └── session_service.py
│   ├── config/
│   │   └── config.py
│   ├── recordings/
│   ├── resources/
│   └── requirements.txt
├── config/
│   └── README.md
├── docs/
│   ├── a-meta-analysis of the effectiveness of mobile supported.pdf
│   ├── Abstract-format[1].docx
│   ├── applsci-14-02710-v2.pdf
│   ├── electronics-13-02537 (1).pdf
│   ├── GOOGLE_OAUTH_SETUP.md
│   ├── paper1.pdf
│   ├── s42979-024-03341-y.pdf
│   └── your skill (1).pdf
└── frontend/
    ├── README.md
    ├── package.json
    ├── public/
    │   ├── assets/
    │   │   ├── css/
    │   │   ├── images/
    │   │   └── js/
    │   ├── config/
    │   │   └── google-config.js
    │   ├── index.html
    │   └── pages/
    ├── src/
    │   ├── api/api.js
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   └── SessionCard.jsx
    │   ├── context/AuthContext.jsx
    │   ├── index.js
    │   ├── main.jsx
    │   ├── pages/
    │   │   ├── Chat.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Login.jsx
    │   │   ├── Notes.jsx
    │   │   ├── Register.jsx
    │   │   ├── Resources.jsx
    │   │   ├── Sessions.jsx
    │   │   └── SessionView.jsx
    │   ├── routes/AppRoutes.jsx
    │   └── styles/global.css
    └── vite.config.js
```

---

## ✨ Features
- User register/login with location metadata
- JWT authentication & token-refresh guard
- Mentor-only session creation & management
- Location-based session recommendations
- Attendance tracking per session
- Session recording upload & playback
- Restricted access to recordings for attendees only
- Realtime-style chat (REST-polling) per session
- Resource sharing (PDF, PPT, images)
- Private notes section stored per learner

---

## ⚙️ Setup Instructions

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8.x

### 2. Backend setup
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

Run the FastAPI server:
```bash
uvicorn app.main:app --reload --port 5712
```

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev
```
Default Vite dev server: http://localhost:5173 (proxy API calls to `http://localhost:5712`).

### 4. MySQL connection
- Create database (example): `CREATE DATABASE knownet CHARACTER SET utf8mb4;`
- Update connection string via `.env` or `backend/config/config.py`  
  `DATABASE_URL=mysql+pymysql://<user>:<password>@localhost:3306/knownet`
- Ensure the configured user has `SELECT, INSERT, UPDATE, DELETE` privileges.
- Run SQLAlchemy metadata creation (e.g., `python -m app.main` with `Base.metadata.create_all(engine)`).

### 5. Environment variables
Create `backend/.env`:
```
SECRET_KEY=replace_me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=mysql+pymysql://user:pass@localhost:3306/knownet
RECORDINGS_DIR=backend/recordings
RESOURCES_DIR=backend/resources
```
Frontend can use `.env` if needed (e.g., `VITE_API_URL`), otherwise defaults to `http://localhost:5712`.

---

## 🔗 API Routes
- `/auth` – register, login, me
- `/sessions` – CRUD + join workflows
- `/attendance` – attendee listings per session
- `/recording` – upload + fetch session recordings
- `/messages` – chat send/list per session
- `/resources` – upload/download shared files

---

## 🎥 Recording Logic
- **Capture:** Mentors use a WebRTC-capable browser. The UI captures audio/video via `MediaRecorder`, producing a WebM/MP4 blob.
- **Upload:** The blob is sent through `recording_service.save_recording_file`, which validates MIME type, writes to `recordings/`, and stores `/recordings/<file>` URL on the session.
- **Access control:** Only the creating mentor and attendees returned by `Attendance` can fetch `/recordings/{session_id}/recordings`. The API rejects non-members with HTTP 403 and hides links on the frontend if the user never joined.

---

## 📌 Important Notes
- **JWT security:** Tokens are signed with HS256 using `SECRET_KEY`. Protect this value and rotate periodically. Always send requests over HTTPS in production.
- **File storage:** Recordings store under `backend/recordings/`, resources under `backend/resources/`. These folders are auto-created on startup; ensure adequate disk quotas and consider S3/Object storage for production.
- **CORS:** FastAPI enables CORS for `http://localhost:3000`/`5173` via `settings.allowed_origins`. Extend this list before deploying to new domains.

---

Happy building with Knownet! Let mentors and learners connect seamlessly 🚀
