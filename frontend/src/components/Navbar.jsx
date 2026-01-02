import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/sessions", label: "Sessions" },
  { to: "/notes", label: "Notes" },
  { to: "/resources", label: "Resources" },
  { to: "/chat", label: "Chat" },
  { to: "/requests", label: "Requests" },
];

export const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar__brand">
        <Link to="/dashboard">
          <img src="/assets/images/logo.jpg" width="40" height="40" alt="KnowNet" />
        </Link>
        <div>
          <strong>KnowNet</strong>
          <p className="navbar__tagline">Peer-to-peer learning</p>
        </div>
      </div>
      {isAuthenticated ? (
        <>
          <nav className="navbar__links">
            {navLinks.map(({ to, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="navbar__user">
            <div className="navbar__meta">
              <span>{user?.name}</span>
              <small>{user?.role}</small>
            </div>
            <button type="button" className="btn btn-secondary" onClick={logout}>
              Logout
            </button>
          </div>
        </>
      ) : (
        <div className="navbar__links">
          <NavLink to="/login" className={({ isActive }) => (isActive ? "active" : "")}>
            Login
          </NavLink>
          <NavLink to="/register" className={({ isActive }) => (isActive ? "active" : "")}>
            Register
          </NavLink>
        </div>
      )}
    </header>
  );
};

export default Navbar;

