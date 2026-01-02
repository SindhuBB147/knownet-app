import { Routes, Route, Navigate } from "react-router-dom";
import { RequireAuth } from "../context/AuthContext";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Sessions from "../pages/Sessions";
import SessionView from "../pages/SessionView";
import Notes from "../pages/Notes";
import Resources from "../pages/Resources";
import Chat from "../pages/Chat";
import Requests from "../pages/Requests";
import MeetingPage from "../pages/MeetingPage";

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />

    <Route
      path="/dashboard"
      element={
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      }
    />
    <Route
      path="/sessions"
      element={
        <RequireAuth>
          <Sessions />
        </RequireAuth>
      }
    />
    <Route
      path="/sessions/:sessionId"
      element={
        <RequireAuth>
          <SessionView />
        </RequireAuth>
      }
    />
    <Route
      path="/notes"
      element={
        <RequireAuth>
          <Notes />
        </RequireAuth>
      }
    />
    <Route
      path="/resources"
      element={
        <RequireAuth>
          <Resources />
        </RequireAuth>
      }
    />
    <Route
      path="/chat"
      element={
        <RequireAuth>
          <Chat />
        </RequireAuth>
      }
    />
    <Route
      path="/chat/:connectionId"
      element={
        <RequireAuth>
          <Chat />
        </RequireAuth>
      }
    />
    <Route
      path="/requests"
      element={
        <RequireAuth>
          <Requests />
        </RequireAuth>
      }
    />
    <Route
      path="/meeting/:connectionId"
      element={
        <RequireAuth>
          <MeetingPage />
        </RequireAuth>
      }
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;

