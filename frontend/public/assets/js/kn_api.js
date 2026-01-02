// Shared helper utilities for the static KnowNet pages
(function () {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    // Always use the proxy '/api' when running via Vite (localhost:5173)
    // If you are using XAMPP directly, you might need to change this, but for now 
    // we assume the user is following instructions to use port 5173.
    const DEFAULT_BASE_URL = "/api";

    const STORAGE_KEYS = {
        TOKEN: "knownet_token",
        USER: "knownet_user"
    };

    // Priority: 1. Environment Variable (Vite) 2. Window Config (Legacy/Manual) 3. Default Proxy
    let envBaseUrl = null;
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            envBaseUrl = import.meta.env.VITE_API_BASE_URL;
        }
    } catch (e) {
        // Ignore errors if import.meta is not available
    }

    const API_BASE_URL = envBaseUrl || window.KN_API_BASE_URL || DEFAULT_BASE_URL;

    const isJSONLike = (value) =>
        value &&
        typeof value === "object" &&
        !(value instanceof FormData) &&
        !(value instanceof Blob) &&
        !(value instanceof ArrayBuffer);

    const getToken = () => localStorage.getItem(STORAGE_KEYS.TOKEN);

    const getUser = () => {
        const cached = localStorage.getItem(STORAGE_KEYS.USER);
        try {
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    };

    const saveAuth = (token, user) => {
        if (token) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        }
        if (user) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        }
    };

    const clearAuth = () => {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
    };

    const requireAuth = () => {
        if (!getToken()) {
            window.location.href = "/pages/kn_login.html";
            return false;
        }
        return true;
    };

    async function request(path, options = {}) {
        const {
            method = "GET",
            body,
            headers = {},
            auth = true,
            raw = false
        } = options;

        const finalHeaders = { ...headers };
        let finalBody = body;

        if (isJSONLike(body)) {
            finalBody = JSON.stringify(body);
            if (!finalHeaders["Content-Type"]) {
                finalHeaders["Content-Type"] = "application/json";
            }
        }

        if (auth) {
            const token = getToken();
            if (!token) {
                throw new Error("You need to sign in to continue.");
            }
            // Ensure token is trimmed (no whitespace) and properly formatted
            const cleanToken = token.trim();
            if (!cleanToken) {
                clearAuth();
                throw new Error("Invalid authentication token. Please sign in again.");
            }
            finalHeaders.Authorization = `Bearer ${cleanToken}`;
        }

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers: finalHeaders,
            body: finalBody
        });

        let data = null;
        const contentType = response.headers.get("content-type") || "";

        if (!raw) {
            if (response.status === 204) {
                data = null;
            } else if (contentType.includes("application/json")) {
                data = await response.json();
            } else {
                data = await response.text();
            }
        }

        if (!response.ok) {
            // Handle 401 Unauthorized - clear auth and redirect to login
            if (response.status === 401 && auth) {
                clearAuth();
                // Small delay to ensure auth is cleared before redirect
                setTimeout(() => {
                    window.location.href = "/pages/kn_login.html";
                }, 100);
                const error = new Error("Session expired. Please sign in again.");
                error.status = 401;
                error.payload = data;
                throw error;
            }

            // Extract error message from response
            let errorMessage = "Request failed";

            if (data) {
                if (typeof data === "string") {
                    errorMessage = data;
                } else if (data.detail) {
                    // FastAPI validation errors return detail as an array
                    if (Array.isArray(data.detail)) {
                        // Extract messages from validation errors
                        errorMessage = data.detail
                            .map(err => {
                                const field = err.loc && err.loc.length > 1 ? err.loc[err.loc.length - 1] : "field";
                                return `${field}: ${err.msg}`;
                            })
                            .join(", ");
                    } else if (typeof data.detail === "string") {
                        errorMessage = data.detail;
                    } else {
                        errorMessage = JSON.stringify(data.detail);
                    }
                } else {
                    errorMessage = JSON.stringify(data);
                }
            } else {
                errorMessage = response.statusText || "Request failed";
            }

            const error = new Error(errorMessage);
            error.status = response.status;
            error.payload = data;
            throw error;
        }

        return raw ? response : data;
    }

    const api = {
        request,
        get: (path, options = {}) =>
            request(path, { ...options, method: "GET" }),
        post: (path, body, options = {}) =>
            request(path, { ...options, method: "POST", body }),
        put: (path, body, options = {}) =>
            request(path, { ...options, method: "PUT", body }),
        delete: (path, options = {}) =>
            request(path, { ...options, method: "DELETE" })
    };

    // internal helper to parse UTC safely
    const parseDate = (dateString) => {
        if (!dateString) return new Date();
        // If it looks like ISO but missing Z offset, assume UTC
        if (typeof dateString === 'string' && dateString.includes('T') && !dateString.endsWith('Z') && !dateString.includes('+')) {
            return new Date(dateString + 'Z');
        }
        return new Date(dateString);
    };

    const util = {
        formatTime: (dateString) => {
            const date = parseDate(dateString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        },
        formatDate: (dateString) => {
            const date = parseDate(dateString);
            return date.toLocaleDateString();
        },
        formatRelativeTime: (dateString) => {
            const date = parseDate(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffSeconds = Math.floor(diffMs / 1000);

            if (diffSeconds < 60) return 'Just now';
            const diffMinutes = Math.floor(diffSeconds / 60);
            if (diffMinutes < 60) return `${diffMinutes}m ago`;
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString();
        },
        // Auto-update elements with data-live-time="timestamp"
        initLiveTimes: () => {
            const update = () => {
                document.querySelectorAll('[data-live-time]').forEach(el => {
                    const ts = el.dataset.liveTime;
                    if (ts) el.textContent = util.formatRelativeTime(ts);
                });
            };
            update(); // Initial run
            setInterval(update, 60000); // Run every minute
        }
    };

    window.KN = {
        API_BASE_URL,
        storageKeys: STORAGE_KEYS,
        api,
        util,
        auth: {
            save: saveAuth,
            clear: clearAuth,
            requireAuth,
            getToken,
            getUser,
            refreshProfile: async () => {
                if (!getToken()) return null;
                const profile = await api.get("/profile/details");
                saveAuth(getToken(), profile);
                return profile;
            }
        }
    };
})();

