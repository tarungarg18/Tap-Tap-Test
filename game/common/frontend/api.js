
(function registerTapTapApi(globalScope) {
    const TOKEN_KEY = "tap_tap_token";
    const USER_KEY = "tap_tap_user";
    const REMEMBER_KEY = "tap_tap_remember";

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
    }

    function setToken(token, options = {}) {
        const { persistent = true } = options;

        if (token) {
            localStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(TOKEN_KEY);
            localStorage.setItem(REMEMBER_KEY, persistent ? "true" : "false");
            const storage = persistent ? localStorage : sessionStorage;
            storage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(TOKEN_KEY);
        }
    }

    function getUser() {
        try {
            const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    function setUser(user, options = {}) {
        const { persistent = localStorage.getItem(REMEMBER_KEY) !== "false" } = options;

        if (user) {
            localStorage.removeItem(USER_KEY);
            sessionStorage.removeItem(USER_KEY);
            const storage = persistent ? localStorage : sessionStorage;
            storage.setItem(USER_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(USER_KEY);
            sessionStorage.removeItem(USER_KEY);
        }
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(REMEMBER_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
    }

    function navigate(path, options = {}) {
        const { replace = false } = options;
        const currentPath = window.location.pathname;

        if (!path || currentPath === path) {
            return false;
        }

        if (replace) {
            window.location.replace(path);
        } else {
            window.location.assign(path);
        }

        return true;
    }

    function requireAuth(redirectTo = "/login") {
        const token = getToken();
        if (!token) {
            navigate(redirectTo, { replace: true });
            return false;
        }
        return true;
    }

    async function requestJson(url, options = {}) {
        const { auth = false, headers = {}, ...rest } = options;

        const mergedHeaders = {
            ...headers
        };

        if (auth) {
            const token = getToken();
            if (!token) {
                throw new Error("Authentication required");
            }
            mergedHeaders.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...rest,
            headers: mergedHeaders
        });

        let payload = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }

        if (!response.ok) {
            if (auth && response.status === 401) {
                clearSession();
                window.location.assign("/login");
            }
            const message = payload?.error || `Request failed (${response.status})`;
            throw new Error(message);
        }

        return payload;
    }

    async function signup({ username, email, password, remember = true }) {
        const result = await requestJson("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });

        setToken(result.token, { persistent: remember });
        setUser(result.user, { persistent: remember });
        return result;
    }

    async function login({ identifier, password, remember = true }) {
        const result = await requestJson("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password })
        });

        setToken(result.token, { persistent: remember });
        setUser(result.user, { persistent: remember });
        return result;
    }

    async function getMe() {
        const result = await requestJson("/api/auth/me", { auth: true });
        if (result?.user) {
            setUser(result.user);
        }
        return result;
    }

    function logout() {
        clearSession();
    }

    function getGames() {
        return requestJson("/api/games");
    }

    function getGameSummary() {
        return requestJson("/api/games/summary");
    }

    function getLevels(gameName) {
        return requestJson(`/api/games/${gameName}/levels`, { auth: true });
    }

    function getLevelConfig(gameName, levelFile) {
        return requestJson(`/api/games/${gameName}/config/${levelFile}`, { auth: true });
    }

    function getFlexibleConfig(gameName) {
        return requestJson(`/api/games/${gameName}/flexible`, { auth: true });
    }

    function updateFlexibleConfig(gameName, configObject) {
        return requestJson(`/api/games/${gameName}/flexible`, {
            method: "PUT",
            auth: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(configObject)
        });
    }

    function getLeaderboard(gameName, options = {}) {
        const query = options.level ? `?level=${encodeURIComponent(options.level)}` : "";
        return requestJson(`/api/games/${gameName}/leaderboard${query}`, { auth: true });
    }

    function getAllLeaderboards(limit) {
        const query = limit != null ? `?limit=${encodeURIComponent(String(limit))}` : "";
        return requestJson(`/api/games/leaderboards${query}`, { auth: true });
    }

    function submitLeaderboard(gameName, body) {
        return requestJson(`/api/games/${gameName}/leaderboard`, {
            method: "POST",
            auth: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
    }

    function getDashboard() {
        return requestJson("/api/dashboard/me", { auth: true }).then((result) => {
            if (result?.user) {
                setUser(result.user);
            }
            return result;
        });
    }

    function getGlobalLeaderboard(page = 1, limit = 10) {
        const query = `?page=${encodeURIComponent(String(page))}&limit=${encodeURIComponent(String(limit))}`;
        return requestJson(`/api/dashboard/leaderboard${query}`, { auth: true });
    }

    function submitContactRequest(body) {
        return requestJson("/api/mail/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
    }

    globalScope.TapTapApi = {
        getToken,
        setToken,
        getUser,
        setUser,
        clearSession,
        navigate,
        requireAuth,
        signup,
        login,
        getMe,
        logout,
        getGames,
        getGameSummary,
        getLevels,
        getLevelConfig,
        getFlexibleConfig,
        updateFlexibleConfig,
        getLeaderboard,
        getAllLeaderboards,
        submitLeaderboard,
        getDashboard,
        getGlobalLeaderboard,
        submitContactRequest
    };
})(window);
