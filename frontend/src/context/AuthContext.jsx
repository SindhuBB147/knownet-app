import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi, profileApi, storageKeys } from "../api/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem(storageKeys.USER);
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(storageKeys.TOKEN));
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setReady(true);
        return;
      }
      try {
        const profile = await authApi.me();
        setUser(profile);
        localStorage.setItem(storageKeys.USER, JSON.stringify(profile));
      } catch {
        logout();
      } finally {
        setReady(true);
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(storageKeys.TOKEN, nextToken);
    localStorage.setItem(storageKeys.USER, JSON.stringify(nextUser));
  };

  const login = async (credentials) => {
    setLoading(true);
    try {
      const result = await authApi.login(credentials);
      persist(result.access_token, result.user);
      return result.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const result = await authApi.register(payload);
      persist(result.access_token, result.user);
      return result.user;
    } catch (error) {
      console.error("Registration API error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUserLocation = async (latitude, longitude) => {
    if (!user) return;
    try {
      const updatedUser = await profileApi.updateDetails({
        first_name: user.name.split(" ")[0],
        last_name: user.name.split(" ").slice(1).join(" ") || "",
        location: user.location,
        latitude,
        longitude,
      });
      // Merge updated profile details into local user state
      const nextUser = { ...user, ...updatedUser.profile, latitude, longitude };
      // Profile API returns different structure, we probably just want to update fields we know changed or re-fetch me()
      // Actually profileApi.updateDetails returns ProfileDetailsResponse which has the full user struct usually
      // Let's safe-guard by just updating what we know or re-fetching.
      // Simpler: just update local state with new location
      const merged = { ...user, latitude, longitude };
      setUser(merged);
      localStorage.setItem(storageKeys.USER, JSON.stringify(merged));
    } catch (error) {
      console.error("Failed to update location:", error);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(storageKeys.TOKEN);
    localStorage.removeItem(storageKeys.USER);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      loading,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      updateUserLocation,
    }),
    [user, token, ready, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

export const RequireAuth = ({ children }) => {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.ready) {
    return <div className="page">Loading...</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

