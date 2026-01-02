# Knownet Platform - Project Abstract & Technical Workflow

## 1. Project Abstract
**Knownet** is a comprehensive full-stack e-learning platform designed to bridge the gap between students and mentors through interactive real-time sessions. The platform facilitates seamless knowledge transfer by offering robust features such as secure user authentication with location metadata, role-based access control (Student/Mentor), and location-based session recommendations.

**Key capabilities include:**
*   **Real-time Collaboration:** Video conferencing powered by WebRTC and instant chat messaging.
*   **Session Management:** Mentors can schedule sessions, track attendance, and upload resources (PDFs, images).
*   **Content Archival:** Sessions can be recorded, stored using efficient file handling, and played back securely by authorized attendees.
*   **Smart Discovery:** A location-aware recommendation engine connects learners with mentors in their vicinity, fostering local educational communities.

Built with a scalable architecture using **React.js** for a dynamic frontend and **FastAPI** for a high-performance backend backed by **MySQL**, Knownet ensures a responsive and secure environment for modern virtual education.

---

## 2. Technical Architecture

### 2.1. Tech Stack
| Layer | Technology | Key Libraries/Modules |
| :--- | :--- | :--- |
| **Frontend** | React.js (Vite) | `axios` (API), `react-router-dom` (Routing), `tailwindcss` (UI) |
| **Backend** | Python FastAPI | `sqlalchemy` (ORM), `pydantic` (Validation), `jwt` (Auth) |
| **Database** | MySQL | Relational data model for Users, Sessions, Attendance, Messages |
| **Storage** | Local File System | `backend/recordings/` for media, `backend/resources/` for docs |
| **Protocols** | HTTPS, WSS | REST API (JSON), WebRTC (P2P Video), WebSocket (Signaling) |

### 2.2. Directory Structure Overview
```text
Mini Project/
├── backend/                  # Server-side logic
│   ├── app/
│   │   ├── api/              # API Route Handlers (Endpoints)
│   │   ├── services/         # Business Logic Layer
│   │   ├── models/           # Database Models (SQLAlchemy)
│   │   └── main.py           # Application Entry Point
│   ├── recordings/           # Video storage
│   └── resources/            # File assets storage
└── frontend/                 # Client-side application
    ├── src/
    │   ├── components/       # Reusable UI widgets
    │   ├── pages/            # Main application views
    │   ├── context/          # Global State (AuthContext)
    │   └── api/              # Axios configuration
    └── public/               # Static assets
```

---

## 3. Workflows

### 3.1. User Journey Workflow
1.  **Registration & Auth:** User signs up with email/password and location. System hashes password (bcrypt) and returns a generic "Success" message. Login grants a `Bearer` JWT token.
2.  **Dashboard Access:**
    *   **Mentors:** View "My Sessions", "Create Session", and uploaded resources.
    *   **Learners:** View "Sessions Near Me" (Geospatial logic), "Search", and "Enrolled Sessions".
3.  **Live Session logic:**
    *   User clicks "Join" -> Frontend requests entry.
    *   Browser requests Camera/Mic permissions.
    *   Frontend connects to WebRTC signaling server (or direct P2P mesh).
    *   Use Chat box to send messages (polled every X seconds).
4.  **Post-Session:**
    *   Mentor stops recording -> Blob sent to backend API -> Saved as `.webm`.
    *   System updates `Attendance` table with participant list.
    *   Users can view the "Recording" button on the session card (if authorized).

### 3.2. Technical Workflow (Backend Request Cycle)
This details how a typical API request (e.g., "Create Session") is processed:

1.  **Request Ingestion:**
    *   `POST /api/sessions` received by **Uvicorn** server.
    *   **Middleware:** Checks CORS headers and Request ID.
2.  **Dependency Injection (FastAPI):**
    *   `get_current_user` dependency runs.
    *   Decodes JWT header -> Validates signature -> Checks expiry.
    *   If invalid: returns `401 Unauthorized`.
    *   If valid: fetches User ID and injects `user` object into the route.
3.  **Service Layer:**
    *   `session_service.create_session(...)` is called.
    *   Validates input data (Time, Title, Description).
    *   Checks logic (e.g., "Is user a Mentor?").
4.  **Database Transaction:**
    *   `SQLAlchemy` session opens transaction.
    *   `Session` model instance created and added.
    *   `commit()` executes SQL `INSERT`.
5.  **Response:**
    *   Pydantic model converts the created database object to JSON.
    *   Returns `200 OK` with session details.

### 3.3. Technical Workflow (Frontend Data Cycle)
This details how the React frontend handles data (e.g., "Loading Dashboard"):

1.  **Component Mount:**
    *   `Dashboard.jsx` loads -> `useEffect` hook triggers `fetchSessions()`.
2.  **API Call:**
    *   `api.js` (Axios instance) intercepts request.
    *   Injects header: `Authorization: Bearer <token>`.
    *   Sends `GET /api/sessions/recommendations`.
3.  **State Update:**
    *   Await response.
    *   **Success:** `setSessions(response.data)`. React re-renders with session cards.
    *   **Error:** `catch` block triggers `toast.error("Failed to load sessions")`.
4.  **User Interaction:**
    *   User clicks a card -> `navigate('/session/:id')`.
    *   React Router loads the Session View component.

---

## 4. Key Security & Performance Features
*   **Password Hashing:** Uses `bcrypt` to salt and hash passwords before storage.
*   **Token-Based Auth:** Stateless JWT authentication reduces database load on every request.
*   **Lazy Loading:** Frontend routes are lazy-loaded to improve initial load time.
*   **MIME Validation:** File uploads (Recordings/Resources) are checked for allowed types (PDF, MP4, WebM) to prevent script execution attacks.
