const { useCallback, useEffect, useMemo, useRef, useState } = React;

const GAME_NAME = "Tap";
const FLEX_LEVEL = "flexible.json";
const DUMMY_AVATAR =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop offset='0%' stop-color='%23b3d4ff'/%3E%3Cstop offset='100%' stop-color='%238bb0ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='60' cy='60' r='60' fill='url(%23a)'/%3E%3Ccircle cx='60' cy='46' r='24' fill='%23f6fbff'/%3E%3Cpath d='M24 104c6-18 19-30 36-30s30 12 36 30' fill='%23f6fbff'/%3E%3C/svg%3E";

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

function cleanLevelName(levelFile) {
    return String(levelFile || "").replace(/\.json$/i, "");
}

function clampPositive(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return n;
}

function App() {
    const api = window.TapTapApi;

    const engineRef = useRef(null);
    const submitLockRef = useRef(false);

    const [user, setUser] = useState(api.getUser());
    const [levels, setLevels] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState("");
    const [loading, setLoading] = useState(false);

    const [snapshot, setSnapshot] = useState(defaultSnapshot());
    const [leaderboard, setLeaderboard] = useState([]);
    const [statusText, setStatusText] = useState("Press TAP button or Space");
    const [errorText, setErrorText] = useState("");
    const [avatarOpen, setAvatarOpen] = useState(false);

    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customSettings, setCustomSettings] = useState({ target: 10, timer: 20 });

    const levelLabel = useMemo(() => cleanLevelName(selectedLevel), [selectedLevel]);

    const stopEngine = useCallback(() => {
        if (engineRef.current) {
            engineRef.current.dispose();
        }
        engineRef.current = null;
    }, []);

    const loadLeaderboard = useCallback(
        async (levelFile = selectedLevel) => {
            try {
                const levelParam = cleanLevelName(levelFile);
                const payload = await api.getLeaderboard(GAME_NAME, levelParam ? { level: levelParam } : {});
                setLeaderboard(Array.isArray(payload?.leaderboard) ? payload.leaderboard : []);
            } catch (err) {
                setErrorText(err.message || "Failed to load leaderboard");
            }
        },
        [api, selectedLevel]
    );

    function renderLeaderboardStars(score) {
        const starCount = Math.min(5, Math.max(1, Math.round((score || 0) / 700)));
        return Array.from({ length: starCount }, (_, index) => (
            <span key={index} className="leaderboard-star">*</span>
        ));
    }

    async function autoSubmit(levelFile, finalSnapshot) {
        if (submitLockRef.current) return;
        submitLockRef.current = true;

        try {
            const levelParam = cleanLevelName(levelFile);
            const result = await api.submitLeaderboard(GAME_NAME, {
                score: finalSnapshot.score || 0,
                reason: finalSnapshot.reason || "FINISHED",
                level: levelParam
            });
            await loadLeaderboard(levelFile);
            setStatusText(
                result?.improved
                    ? `New personal best recorded for ${user?.username || "you"}.`
                    : "Run finished - score did not beat your existing record."
            );
        } catch (err) {
            setErrorText(err.message || "Failed to save score");
        }
    }

    const startLevel = useCallback(
        async (levelFile, overrides = null) => {
            if (!levelFile) return;

            setLoading(true);
            setErrorText("");
            setStatusText("Initializing game engine...");

            try {
                const config = await api.getLevelConfig(GAME_NAME, levelFile);
                const merged = {
                    ...config,
                    game: {
                        ...(config.game || {}),
                        title: `${config.game?.title || "Tap"} (${cleanLevelName(levelFile) || "level"})`
                    },
                    timer: {
                        ...(config.timer || {}),
                        limit: overrides?.timer ?? config.timer?.limit
                    },
                    winCondition: {
                        ...(config.winCondition || {}),
                        value: overrides?.target ?? config.winCondition?.value
                    }
                };

                stopEngine();
                submitLockRef.current = false;
                setSnapshot(defaultSnapshot());

                const game = new window.TapGame(merged);
                const engine = new window.GameEngine(merged, {
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
        },
        [api, stopEngine, loadLeaderboard, user]
    );

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
                await loadLeaderboard(chosen);
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
        if (!selectedLevel) return;
        if (selectedLevel === FLEX_LEVEL) {
            setShowCustomModal(true);
            return;
        }
        startLevel(selectedLevel);
        loadLeaderboard(selectedLevel);
    }, [selectedLevel, startLevel, loadLeaderboard]);

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
        api.navigate("/login");
    }

    function handleLevelChange(levelFile) {
        setSelectedLevel(levelFile);
        if (levelFile === FLEX_LEVEL) {
            setShowCustomModal(true);
        }
    }

    function handleCustomInput(key, value) {
        setCustomSettings((prev) => ({ ...prev, [key]: value }));
    }

    function handleCustomSubmit(event) {
        event.preventDefault();
        const normalized = {
            target: clampPositive(customSettings.target, 10),
            timer: clampPositive(customSettings.timer, 30)
        };
        setCustomSettings(normalized);
        setShowCustomModal(false);
        startLevel(selectedLevel || FLEX_LEVEL, normalized);
        loadLeaderboard(selectedLevel || FLEX_LEVEL);
    }

    function handleCustomCancel() {
        setShowCustomModal(false);
        if (selectedLevel === FLEX_LEVEL) {
            const fallback = levels.find((lvl) => lvl !== FLEX_LEVEL) || "";
            if (fallback) setSelectedLevel(fallback);
        }
    }

    return (
        <div className="page">
            <div className="page-nav">
                <div className="brand-mark">Tap</div>
                <div className="nav-actions">
                    <button className="btn-secondary" onClick={() => api.navigate("/home")}>Home</button>
                    <button className="btn-secondary" onClick={() => api.navigate("/dashboard")}>Dashboard</button>
                    <div className="avatar-wrap" onClick={() => setAvatarOpen((open) => !open)}>
                        <div className="avatar-ring">
                            <div className="avatar-photo" style={{ backgroundImage: `url(${DUMMY_AVATAR})` }} aria-label="Open profile menu"></div>
                            <div className="avatar-initial">{(user?.username || "P").charAt(0).toUpperCase()}</div>
                        </div>
                        {avatarOpen ? (
                            <div className="avatar-menu">
                                <div className="avatar-name">{user?.username || "Player"}</div>
                                <div className="avatar-email">Signed in</div>
                                <button className="btn-secondary" onClick={() => api.navigate("/dashboard")}>View dashboard</button>
                                <button className="btn-danger" onClick={logout}>Logout</button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            <section className="panel">
                <div className="header">
                    <h1 className="title">{snapshot.gameState?.title || "Tap"}</h1>

                    <div className="actions">
                        <select
                            value={selectedLevel}
                            onChange={(event) => handleLevelChange(event.target.value)}
                            disabled={loading}
                            aria-label="Select level"
                        >
                            {levels.map((levelName) => {
                                const label = levelName.replace(/\.json$/i, "");
                                return (
                                    <option key={levelName} value={levelName}>{label}</option>
                                );
                            })}
                        </select>

                        <button
                            onClick={() => {
                                if (selectedLevel === FLEX_LEVEL) {
                                    setShowCustomModal(true);
                                } else {
                                    startLevel(selectedLevel);
                                }
                            }}
                            disabled={loading}
                        >
                            Restart
                        </button>
                    </div>
                </div>

                <div className="stats">
                    <div className="stat">
                        <div className="label">Score</div>
                        <div className="value">{snapshot.score}</div>
                    </div>

                    <div className="stat">
                        <div className="label">Time Left</div>
                        <div className="value">{snapshot.timeLeft}s</div>
                    </div>

                    <div className="stat">
                        <div className="label">Target / Progress</div>
                        <div className="value">{goalText}</div>
                    </div>
                </div>

                <div className="status">{statusText}</div>
                {errorText ? <div className="status error">{errorText}</div> : null}

                <div className="tap-area">
                    <button
                        className="tap-btn"
                        onClick={handleTap}
                        disabled={snapshot.ended || loading}
                        aria-label="Tap button"
                    >
                        {snapshot.ended ? "Done" : "TAP"}
                    </button>
                    <div className="hint">Controls: Space key or TAP button</div>
                </div>
            </section>

            <section className="panel leaderboard">
                <h2>{levelLabel ? `${levelLabel} Leaderboard` : "Leaderboard"}</h2>
                <ol className="leaderboard-list">
                    {leaderboard.map((entry, index) => (
                        <li key={`${entry.username}-${entry.updatedAt || index}`} className="leaderboard-item">
                            <div className={`leaderboard-rank rank-${Math.min(index + 1, 4)}`}>
                                {index + 1}
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
                {leaderboard.length === 0 ? (
                    <div className="status">No scores yet. Finish a run to add one.</div>
                ) : null}
            </section>

            {showCustomModal ? (
                <div className="overlay" onClick={handleCustomCancel}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Flexible settings</h3>
                        <p style={{ marginTop: 0 }}>Choose target taps and timer before starting.</p>
                        <form onSubmit={handleCustomSubmit} className="custom-form">
                            <label className="field">
                                <span>Target taps</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={customSettings.target}
                                    onChange={(e) => handleCustomInput("target", e.target.value)}
                                />
                            </label>
                            <label className="field">
                                <span>Timer (seconds)</span>
                                <input
                                    type="number"
                                    min="5"
                                    value={customSettings.timer}
                                    onChange={(e) => handleCustomInput("timer", e.target.value)}
                                />
                            </label>
                            <div className="modal-actions">
                                <button className="btn-secondary" type="button" onClick={handleCustomCancel}>Cancel</button>
                                <button className="btn-primary" type="submit">Start</button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
