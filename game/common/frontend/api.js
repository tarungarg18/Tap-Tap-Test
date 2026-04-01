(function registerTapTapApi(globalScope) {
    const TOKEN_KEY = "tap_tap_token";
    const USER_KEY = "tap_tap_user";

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || "";
    }

    function setToken(token) {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    }

    function getUser() {
        try {
            const raw = localStorage.getItem(USER_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    function setUser(user) {
        if (user) {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(USER_KEY);
        }
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    function requireAuth(redirectTo = "/login") {
        const token = getToken();
        if (!token) {
            window.location.href = redirectTo;
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
            const message = payload?.error || `Request failed (${response.status})`;
            throw new Error(message);
        }

        return payload;
    }

    async function signup({ username, email, password }) {
        const result = await requestJson("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });

        setToken(result.token);
        setUser(result.user);
        return result;
    }

    async function login({ identifier, password }) {
        const result = await requestJson("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password })
        });

        setToken(result.token);
        setUser(result.user);
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

    function getLevels(gameName) {
        return requestJson(`/api/games/${gameName}/levels`);
    }

    function getLevelConfig(gameName, levelFile) {
        return requestJson(`/api/games/${gameName}/config/${levelFile}`);
    }

    function getFlexibleConfig(gameName) {
        return requestJson(`/api/games/${gameName}/flexible`);
    }

    function updateFlexibleConfig(gameName, configObject) {
        return requestJson(`/api/games/${gameName}/flexible`, {
            method: "PUT",
            auth: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(configObject)
        });
    }

    function getLeaderboard(gameName) {
        return requestJson(`/api/games/${gameName}/leaderboard`);
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
        return requestJson("/api/dashboard/me", { auth: true });
    }

    globalScope.TapTapApi = {
        getToken,
        setToken,
        getUser,
        setUser,
        clearSession,
        requireAuth,
        signup,
        login,
        getMe,
        logout,
        getGames,
        getLevels,
        getLevelConfig,
        getFlexibleConfig,
        updateFlexibleConfig,
        getLeaderboard,
        submitLeaderboard,
        getDashboard
    };
})(window);
