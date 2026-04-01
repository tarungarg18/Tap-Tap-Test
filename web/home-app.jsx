const { useEffect, useMemo, useState } = React;

function HomePage() {
    const api = window.TapTapApi;

    const [user, setUser] = useState(api.getUser());
    const [games, setGames] = useState([]);
    const [selectedGame, setSelectedGame] = useState("");
    const [levels, setLevels] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState("");

    const [flexibleRaw, setFlexibleRaw] = useState("{}");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const selectedGameSafe = useMemo(() => selectedGame || "", [selectedGame]);

    useEffect(() => {
        if (!api.requireAuth("/login")) return;

        async function bootstrap() {
            try {
                const [mePayload, gamesPayload] = await Promise.all([
                    api.getMe(),
                    api.getGames()
                ]);

                setUser(mePayload.user || null);

                const availableGames = Array.isArray(gamesPayload?.games)
                    ? gamesPayload.games.map((item) => item.name)
                    : [];

                setGames(availableGames);

                if (availableGames.length > 0) {
                    setSelectedGame(availableGames[0]);
                }
            } catch (err) {
                setError(err.message || "Failed to load home");
            }
        }

        bootstrap();
    }, []);

    useEffect(() => {
        if (!selectedGameSafe) return;

        async function loadGameData() {
            setBusy(true);
            setError("");
            setSuccess("");

            try {
                const [levelsPayload, flexiblePayload] = await Promise.all([
                    api.getLevels(selectedGameSafe),
                    api.getFlexibleConfig(selectedGameSafe)
                ]);

                const availableLevels = Array.isArray(levelsPayload?.levels)
                    ? levelsPayload.levels
                    : [];

                setLevels(availableLevels);
                setSelectedLevel((current) => {
                    if (current && availableLevels.includes(current)) return current;
                    return availableLevels[0] || "";
                });

                setFlexibleRaw(JSON.stringify(flexiblePayload, null, 2));
            } catch (err) {
                setError(err.message || "Failed to load game data");
            } finally {
                setBusy(false);
            }
        }

        loadGameData();
    }, [selectedGameSafe]);

    function goToPlay(levelName) {
        if (!selectedGameSafe || !levelName) return;
        const url = `/games/${encodeURIComponent(selectedGameSafe)}?level=${encodeURIComponent(levelName)}`;
        window.location.href = url;
    }

    async function saveFlexible() {
        if (!selectedGameSafe) return;

        setBusy(true);
        setError("");
        setSuccess("");

        try {
            const parsed = JSON.parse(flexibleRaw);
            await api.updateFlexibleConfig(selectedGameSafe, parsed);
            setSuccess("flexible.json updated successfully.");
        } catch (err) {
            setError(err.message || "Failed to save flexible config");
        } finally {
            setBusy(false);
        }
    }

    function logout() {
        api.logout();
        window.location.href = "/login";
    }

    return (
        <div className="page-wrap">
            <div className="topbar">
                <div className="brand">Tap-Tap Home</div>
                <div className="actions">
                    <button className="secondary" onClick={() => (window.location.href = "/dashboard")}>Dashboard</button>
                    <button className="danger" onClick={logout}>Logout</button>
                </div>
            </div>

            <div className="home-grid">
                <section className="card">
                    <h2>Player</h2>
                    <div className="muted" style={{ marginTop: "6px" }}>
                        Logged in as <strong>{user?.username || "-"}</strong> ({user?.email || "-"})
                    </div>

                    <div className="field" style={{ marginTop: "14px" }}>
                        <label>Select Game</label>
                        <select value={selectedGameSafe} onChange={(e) => setSelectedGame(e.target.value)} disabled={busy}>
                            {games.map((gameName) => (
                                <option key={gameName} value={gameName}>{gameName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="field">
                        <label>Select Level</label>
                        <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} disabled={busy}>
                            {levels.map((levelName) => (
                                <option key={levelName} value={levelName}>{levelName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="row" style={{ marginTop: "12px" }}>
                        <button onClick={() => goToPlay(selectedLevel)} disabled={busy || !selectedLevel}>Play Selected Level</button>
                        <button className="secondary" onClick={() => goToPlay("flexible.json")} disabled={busy}>Play flexible.json</button>
                    </div>

                    {error ? <div className="error">{error}</div> : null}
                    {success ? <div className="success-text">{success}</div> : null}
                </section>

                <section className="card">
                    <h2>Flexible Level Editor</h2>
                    <div className="muted" style={{ marginTop: "6px" }}>
                        Modify `flexible.json` for <strong>{selectedGameSafe || "-"}</strong> and play instantly.
                    </div>

                    <div className="field" style={{ marginTop: "12px" }}>
                        <label>flexible.json</label>
                        <textarea value={flexibleRaw} onChange={(e) => setFlexibleRaw(e.target.value)} spellCheck={false} />
                    </div>

                    <div className="row">
                        <button className="success" onClick={saveFlexible} disabled={busy}>Save flexible.json</button>
                        <button className="secondary" onClick={() => setFlexibleRaw("{}")}>Clear Editor</button>
                    </div>

                    <div style={{ marginTop: "14px" }}>
                        <h3>Available Games</h3>
                        {games.map((name) => (
                            <div key={name} className="game-card">
                                <div><strong>{name}</strong></div>
                                <div className="muted">Frontend + logic loaded from its own folder.</div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<HomePage />);
