const { useEffect, useMemo, useRef, useState } = React;

function getStoredTheme() {
    return localStorage.getItem("tapTapTheme") || "light";
}

function DashboardPage() {
    const api = window.TapTapApi;
    const [user, setUser] = useState(api.getUser());
    const [stats, setStats] = useState([]);
    const [theme, setTheme] = useState(getStoredTheme);
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [error, setError] = useState("");
    const [leaderboard, setLeaderboard] = useState([]);
    const [leaderboardPage, setLeaderboardPage] = useState(1);
    const [leaderboardHasNext, setLeaderboardHasNext] = useState(false);
    const [leaderboardHasPrev, setLeaderboardHasPrev] = useState(false);
    const menuRef = useRef(null);

    const userRank = user && user.globalRank != null ? user.globalRank : "NA";
    const userRankDisplay = userRank === "NA" ? "NA" : Number(userRank).toLocaleString();
    const userPoints = user && Number.isFinite(Number(user.totalScore)) ? Number(user.totalScore) : 0;
    const userPointsDisplay = Number.isFinite(userPoints) ? userPoints.toLocaleString() : "0";

    const totals = useMemo(() => {
        const totalGames = stats.length;
        return { totalGames };
    }, [stats]);

    async function loadGlobalLeaderboard(page = 1) {
        setError("");
        try {
            const payload = await api.getGlobalLeaderboard(page, 10);
            setLeaderboard(Array.isArray(payload?.entries) ? payload.entries : []);
            setLeaderboardPage(payload?.page || page);
            setLeaderboardHasNext(Boolean(payload?.hasNext));
            setLeaderboardHasPrev(Boolean(payload?.hasPrev));
        } catch (err) {
            setError(err.message || "Failed to load leaderboard");
        }
    }

    useEffect(() => {
        document.body.classList.remove("theme-light", "theme-dark");
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem("tapTapTheme", theme);
    }, [theme]);

    useEffect(() => {
        if (!api.requireAuth("/login")) return;

        async function loadDashboard() {
            try {
                const data = await api.getDashboard();
                setUser(data.user || null);
                setStats(Array.isArray(data.stats) ? data.stats : []);
                await loadGlobalLeaderboard(1);
            } catch (err) {
                setError(err.message || "Failed to load dashboard");
            }
        }

        loadDashboard();
    }, []);

    useEffect(() => {
        if (!menuOpen) return;

        function handlePointerDown(event) {
            if (!menuRef.current?.contains(event.target)) {
                setMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("touchstart", handlePointerDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("touchstart", handlePointerDown);
        };
    }, [menuOpen]);

    function logout() {
        api.logout();
        api.navigate("/login");
    }

    function scrollToFooter() {
        document.getElementById("site-footer")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function runSearch(event) {
        event.preventDefault();
        const query = searchText.trim().toLowerCase();
        if (!query) return;

        if (query.includes("home") || query.includes("tap") || query.includes("sudoku") || query.includes("2048")) {
            api.navigate("/home");
            return;
        }

        if (query.includes("about") || query.includes("footer") || query.includes("contact")) {
            scrollToFooter();
            return;
        }

        if (query.includes("login")) {
            api.navigate("/login");
            return;
        }

        if (query.includes("signup") || query.includes("create")) {
            api.navigate("/signup");
        }
    }

    return (
        <div className="page-wrap">
            <nav className="navbar">
                <div className="navbar-brand">
                    <button
                        className="navbar-game-brand"
                        type="button"
                        onClick={() => api.navigate("/home")}
                        aria-label="Go to homepage"
                    >
                        <div className="navbar-game-brand-line">Game</div>
                        <div className="navbar-game-brand-line">Hub</div>
                    </button>
                </div>

                <div className="navbar-center">
                    <button
                        className="nav-pill"
                        type="button"
                        onClick={() => api.navigate("/home")}
                    >
                        Home
                    </button>
                    <button className="nav-pill active" type="button">Dashboard</button>
                    <button className="nav-pill" type="button" onClick={scrollToFooter}>About</button>
                </div>

                <div className="navbar-actions">
                    <form className="navbar-search-trigger" onSubmit={runSearch}>
                        <span className="search-icon navbar-search-icon"></span>
                        <input
                            className="navbar-search-input"
                            type="text"
                            value={searchText}
                            onChange={(event) => setSearchText(event.target.value)}
                            placeholder="Search"
                            aria-label="Search pages"
                        />
                    </form>
                    <button
                        className="theme-toggle icon-toggle"
                        type="button"
                        aria-label={theme === "light" ? "Enable dark mode" : "Enable light mode"}
                        onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
                    >
                        <span className={`theme-icon ${theme === "light" ? "theme-icon-moon" : "theme-icon-sun"}`}></span>
                    </button>

                    <div className="nav-menu-wrap" ref={menuRef}>
                        <button
                            className="profile-toggle"
                            type="button"
                            aria-label="Open account menu"
                            onClick={() => setMenuOpen((value) => !value)}
                        >
                            <span className="profile-icon-head"></span>
                            <span className="profile-icon-body"></span>
                        </button>

                        {menuOpen ? (
                            <div className="profile-card">
                                <div className="profile-card-top">
                                    <div className="profile-card-avatar-wrap">
                                        <div className="profile-card-avatar">
                                            {(user?.username || "Tap Tap").slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="profile-card-progress">75%</div>
                                    </div>
                                    <div className="profile-card-top-actions">
                                        <button
                                            className="profile-card-edit"
                                            type="button"
                                            onClick={() => api.navigate("/dashboard")}
                                        >
                                            Edit Profile
                                        </button>
                                    </div>
                                </div>

                                <div className="profile-card-name">{user?.username || "Tap Tap Player"}</div>
                                <div className="profile-card-email">{user?.email || "Create an account to save your progress"}</div>

                                <div className="profile-card-stats">
                                    <div className="profile-card-stat">
                                        <span className="profile-card-stat-icon trophy"></span>
                                        <span>Your Global Rank</span>
                                        <strong>{userRankDisplay}</strong>
                                    </div>
                                    <div className="profile-card-stat">
                                        <span className="profile-card-stat-icon star"></span>
                                        <span>Your Points</span>
                                        <strong>{userPointsDisplay}</strong>
                                    </div>
                                </div>

                                <button className="profile-card-link danger" type="button" onClick={logout}>Logout</button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </nav>

            <div className="dashboard-grid">
                <section className="card dashboard-profile-card">
                    <h2>{user?.username || "Player"}</h2>
                    <div className="muted dashboard-email">{user?.email || ""}</div>

                    <div className="kpi-grid dashboard-kpis">
                        <div className="kpi">
                            <div className="label">Games Played</div>
                            <div className="value">{totals.totalGames}</div>
                        </div>
                        <div className="kpi">
                            <div className="label">Total Score</div>
                            <div className="value">{userPointsDisplay}</div>
                        </div>
                        <div className="kpi">
                            <div className="label">Global Rank</div>
                            <div className="value">{userRankDisplay}</div>
                        </div>
                    </div>

                    <div className="dashboard-stats-block">
                        <h3>Maximum Score by Game</h3>
                        <ol className="list">
                            {stats.map((item, index) => (
                                <li key={`${item.gameName}-${index}`} className="list-item">
                                    <span>{index + 1}</span>
                                    <span>{item.gameName}</span>
                                    <strong>{item.maxScore}</strong>
                                </li>
                            ))}
                        </ol>
                        {stats.length === 0 ? <div className="muted" style={{ marginTop: "8px" }}>No game stats yet.</div> : null}
                    </div>
                </section>

                <section className="card dashboard-recent-card">
                    <div className="section-heading-row">
                        <h2>Global Leaderboard</h2>
                        <div className="recent-score-badge">Page {leaderboardPage}</div>
                    </div>
                    <ol className="list dashboard-score-list">
                        {leaderboard.map((item, index) => (
                            <li key={`${item.userId || item.username}-${index}`} className="list-item">
                                <span>{(leaderboardPage - 1) * 10 + index + 1}</span>
                                <span>
                                    <strong>{item.username}</strong>
                                </span>
                                <strong>{item.score}</strong>
                            </li>
                        ))}
                    </ol>
                    {leaderboard.length === 0 ? <div className="muted" style={{ marginTop: "8px" }}>No leaderboard entries yet.</div> : null}
                    <div className="dashboard-pagination">
                        <button
                            type="button"
                            className="promo-button promo-button-secondary"
                            onClick={() => loadGlobalLeaderboard(Math.max(1, leaderboardPage - 1))}
                            disabled={!leaderboardHasPrev}
                        >
                            Prev
                        </button>
                        <button
                            type="button"
                            className="promo-button promo-button-primary"
                            onClick={() => loadGlobalLeaderboard(leaderboardPage + 1)}
                            disabled={!leaderboardHasNext}
                        >
                            Next
                        </button>
                    </div>
                </section>
            </div>

            {error ? <div className="error" style={{ width: "min(1100px, 100%)", margin: "14px auto 0" }}>{error}</div> : null}

            <footer id="site-footer" className="site-footer">
                <div className="site-footer-stack">
                    <div className="site-footer-brand">Game Hub</div>
                    <div className="site-footer-copy">Game Hub © 2026. All rights reserved.</div>
                </div>
                <div>
                    <div className="site-footer-column-title">Get To Know Us</div>
                    <div className="site-footer-links">
                        <span className="site-footer-link">All Games</span>
                        <span className="site-footer-link">Categories</span>
                        <span className="site-footer-link">Progress</span>
                    </div>
                </div>
                <div>
                    <div className="site-footer-column-title">Support</div>
                    <div className="site-footer-links">
                        <span className="site-footer-link">Contact Us</span>
                        <span className="site-footer-link">FAQ</span>
                        <span className="site-footer-link">Resources</span>
                    </div>
                </div>
                <div>
                    <div className="site-footer-column-title">Privacy and Terms</div>
                    <div className="site-footer-links">
                        <span className="site-footer-link">Terms and Conditions</span>
                        <span className="site-footer-link">Privacy Policy</span>
                    </div>
                </div>
                <div>
                    <div className="site-footer-column-title">Follow Us</div>
                    <div className="site-footer-socials">
                        <span className="site-footer-social social-linkedin">in</span>
                        <span className="site-footer-social social-tiktok">tt</span>
                        <span className="site-footer-social social-youtube">yt</span>
                        <span className="site-footer-social social-instagram">ig</span>
                        <span className="site-footer-social social-facebook">f</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DashboardPage />);
