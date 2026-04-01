const { useEffect, useMemo, useState } = React;

function DashboardPage() {
    const api = window.TapTapApi;

    const [user, setUser] = useState(api.getUser());
    const [stats, setStats] = useState([]);
    const [recentScores, setRecentScores] = useState([]);
    const [error, setError] = useState("");

    const totals = useMemo(() => {
        const totalGames = stats.length;
        const bestScore = stats.reduce((max, item) => Math.max(max, item.maxScore || 0), 0);
        const totalRuns = recentScores.length;
        return { totalGames, bestScore, totalRuns };
    }, [stats, recentScores]);

    useEffect(() => {
        if (!api.requireAuth("/login")) return;

        async function loadDashboard() {
            try {
                const data = await api.getDashboard();
                setUser(data.user || null);
                setStats(Array.isArray(data.stats) ? data.stats : []);
                setRecentScores(Array.isArray(data.recentScores) ? data.recentScores : []);
            } catch (err) {
                setError(err.message || "Failed to load dashboard");
            }
        }

        loadDashboard();
    }, []);

    function logout() {
        api.logout();
        window.location.href = "/login";
    }

    return (
        <div className="page-wrap">
            <div className="topbar">
                <div className="brand">Player Dashboard</div>
                <div className="actions">
                    <button className="secondary" onClick={() => (window.location.href = "/home")}>Home</button>
                    <button className="danger" onClick={logout}>Logout</button>
                </div>
            </div>

            <div className="dashboard-grid">
                <section className="card">
                    <h2>{user?.username || "Player"}</h2>
                    <div className="muted" style={{ marginTop: "6px" }}>{user?.email || ""}</div>

                    <div className="kpi-grid">
                        <div className="kpi">
                            <div className="label">Games Played</div>
                            <div className="value">{totals.totalGames}</div>
                        </div>
                        <div className="kpi">
                            <div className="label">Best Score</div>
                            <div className="value">{totals.bestScore}</div>
                        </div>
                        <div className="kpi">
                            <div className="label">Recent Runs</div>
                            <div className="value">{totals.totalRuns}</div>
                        </div>
                    </div>

                    <div style={{ marginTop: "14px" }}>
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

                <section className="card">
                    <h2>Recent Scores</h2>
                    <ol className="list">
                        {recentScores.map((item, index) => (
                            <li key={`${item.gameName}-${item.createdAt}-${index}`} className="list-item">
                                <span>{index + 1}</span>
                                <span>
                                    <strong>{item.gameName}</strong>
                                    <div className="muted" style={{ fontSize: "0.8rem" }}>{item.level} | {item.reason}</div>
                                </span>
                                <strong>{item.score}</strong>
                            </li>
                        ))}
                    </ol>
                    {recentScores.length === 0 ? <div className="muted" style={{ marginTop: "8px" }}>No score submissions yet.</div> : null}
                </section>
            </div>

            {error ? <div className="error" style={{ width: "min(1100px, 100%)", margin: "14px auto 0" }}>{error}</div> : null}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DashboardPage />);
