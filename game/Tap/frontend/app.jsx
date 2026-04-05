const { useCallback, useEffect, useRef, useState } = React;

const GAME_NAME = "Tap";

function defaultSnapshot() {
    return {
        score: 0,
        timeLeft: 0,
        message: "",
        reason: "",
        ended: false,
        gameState: {
            title: "Tap",
            current: 0,
            score: 0,
            input: "",
            winCondition: { type: "TAP_COUNT", value: 0 },
            gameOver: false
        }
    };
}

function App() {
    const api = window.TapTapApi;

    const engineRef = useRef(null);
    const submitLockRef = useRef(false);

    const [user, setUser] = useState(api.getUser());
    const [levels, setLevels] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState("");
    const [snapshot, setSnapshot] = useState(defaultSnapshot());
    const [leaderboard, setLeaderboard] = useState([]);
    const [statusText, setStatusText] = useState("Press Tap button or Space");
    const [errorText, setErrorText] = useState("");
    const [loading, setLoading] = useState(false);

    const stopEngine = useCallback(() => {
        if (engineRef.current) {
            engineRef.current.dispose();
        }
        engineRef.current = null;
    }, []);

    const loadLeaderboard = useCallback(async () => {
        try {
            const payload = await api.getLeaderboard(GAME_NAME);
            setLeaderboard(Array.isArray(payload?.leaderboard) ? payload.leaderboard : []);
        } catch (err) {
            setErrorText(err.message || "Failed to load leaderboard");
        }
    }, [api]);

    function renderLeaderboardStars(score) {
        const starCount = Math.min(5, Math.max(1, Math.round((score || 0) / 700)));
        return Array.from({ length: starCount }, (_, index) => (
            <span key={index} className="leaderboard-star">★</span>
        ));
    }

    async function autoSubmit(levelFile, finalSnapshot) {
        if (submitLockRef.current) return;
        submitLockRef.current = true;

        try {
            const result = await api.submitLeaderboard(GAME_NAME, {
                score: finalSnapshot.score || 0,
                reason: finalSnapshot.reason || "FINISHED",
                level: levelFile
            });
            await loadLeaderboard();
            setStatusText(
                result?.improved
                    ? `New personal best recorded for ${user?.username || "you"}.`
                    : "Run finished — score did not beat your existing record."
            );
        } catch (err) {
            setErrorText(err.message || "Failed to save score");
        }
    }

    const startLevel = useCallback(async (levelFile) => {
        if (!levelFile) return;

        setLoading(true);
        setErrorText("");

        try {
            const config = await api.getLevelConfig(GAME_NAME, levelFile);

            stopEngine();
            submitLockRef.current = false;

            const game = new window.TapGame(config);
            const engine = new window.GameEngine(config, {
                onRender: (nextSnapshot) => {
                    setSnapshot(nextSnapshot);
                    if (nextSnapshot.message) {
                        setStatusText(nextSnapshot.message);
                    }
                },
                onGameEnd: (finalSnapshot) => {
                    setStatusText(`Game ended: ${finalSnapshot.reason}`);
                    void autoSubmit(levelFile, finalSnapshot);
                }
            });

            engine.setGame(game);
            engine.start();
            engineRef.current = engine;
        } catch (err) {
            setErrorText(err.message || "Failed to load level");
        } finally {
            setLoading(false);
        }
    }, [api, stopEngine, loadLeaderboard, user]);

    useEffect(() => {
        if (!api.requireAuth("/login")) return;

        let active = true;

        async function boot() {
            try {
                const [mePayload, levelPayload] = await Promise.all([
                    api.getMe(),
                    api.getLevels(GAME_NAME)
                ]);

                if (!active) return;

                setUser(mePayload.user || null);

                const available = levelPayload?.levels || [];
                setLevels(available);

                const initialFromQuery = new URLSearchParams(window.location.search).get("level");
                const chosen = initialFromQuery && available.includes(initialFromQuery)
                    ? initialFromQuery
                    : (available[0] || "");

                setSelectedLevel(chosen);
                await loadLeaderboard();
            } catch (err) {
                if (!active) return;
                setErrorText(err.message || "Failed to initialize");
            }
        }

        boot();

        return () => {
            active = false;
            stopEngine();
        };
    }, []);

    useEffect(() => {
        if (selectedLevel) {
            startLevel(selectedLevel);
        }
    }, [selectedLevel, startLevel]);

    function handleTap() {
        if (!engineRef.current || snapshot.ended) return;

        const key = snapshot.gameState?.input;
        if (!key) return;

        engineRef.current.receiveInput(key);
    }

    useEffect(() => {
        function onKeyDown(event) {
            if (event.code !== "Space") return;
            event.preventDefault();
            handleTap();
        }

        window.addEventListener("keydown", onKeyDown, { passive: false });
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [snapshot.ended, snapshot.gameState?.input]);

    const winCondition = snapshot.gameState?.winCondition;
    const goalText = winCondition?.type === "TAP_COUNT"
        ? `${snapshot.gameState.current}/${winCondition.value}`
        : `${snapshot.score}/${winCondition?.value}`;

    function logout() {
        api.logout();
        window.location.href = "/login";
    }

    return (
        <div className="page">
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                <div style={{ color: "#4a6d54" }}>Signed in as <strong>{user?.username || "-"}</strong></div>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button className="secondary" onClick={() => (window.location.href = "/home")}>Home</button>
                    <button className="secondary" onClick={() => (window.location.href = "/dashboard")}>Dashboard</button>
                    <button className="secondary" onClick={logout}>Logout</button>
                </div>
            </div>

            <section className="card">
                <div className="top">
                    <h1>{snapshot.gameState?.title || "Tap"}</h1>
                    <div>
                        <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} disabled={loading}>
                            {levels.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <button style={{ marginLeft: "8px" }} onClick={() => startLevel(selectedLevel)} disabled={loading}>Restart</button>
                    </div>
                </div>

                <div className="stats">
                    <div className="stat"><div className="label">Score</div><div className="value">{snapshot.score}</div></div>
                    <div className="stat"><div className="label">Time</div><div className="value">{snapshot.timeLeft}s</div></div>
                    <div className="stat"><div className="label">Goal</div><div className="value">{goalText}</div></div>
                </div>

                <div className="status">{statusText}</div>
                {errorText ? <div className="status error">{errorText}</div> : null}

                <div className="tap-area">
                    <button className="tap-btn" onClick={handleTap} disabled={snapshot.ended}>TAP</button>
                    <div className="hint">Hint: press Space key or click TAP button</div>
                </div>
            </section>

            <section className="card leaderboard-panel">
                <h2>Leaderboard</h2>
                <ol className="leaderboard-list">
                    {leaderboard.map((entry, index) => (
                        <li key={`${entry.username}-${entry.updatedAt}-${index}`} className="leaderboard-item">
                            <div className={`leaderboard-rank rank-${Math.min(index + 1, 4)}`}>
                                {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                            </div>
                            <div className="leaderboard-player">
                                <div className="leaderboard-avatar">{entry.username?.charAt(0)?.toUpperCase() || "?"}</div>
                                <div className="leaderboard-player-info">
                                    <div className="player-name">{entry.username}</div>
                                    <div className="player-stars">{renderLeaderboardStars(entry.score)}</div>
                                </div>
                            </div>
                            <div className="leaderboard-score">{entry.score}</div>
                        </li>
                    ))}
                </ol>
            </section>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
