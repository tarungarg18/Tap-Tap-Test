const { useCallback, useEffect, useMemo, useRef, useState } = React;

const GAME_NAME = "Tap";
const FLEXIBLE_LEVEL_FILE = "flexible.json";

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

function formatLevelLabel(levelName) {
    const value = String(levelName || "").replace(/\.json$/i, "");
    const flexibleMatch = /^flexible-t(\d+)-g(\d+)$/i.exec(value);
    if (flexibleMatch) {
        return `flexible (${flexibleMatch[1]}s / target ${flexibleMatch[2]})`;
    }
    return value;
}

function createFlexibleLevelKey(timerLimit, targetScore) {
    return `flexible-t${timerLimit}-g${targetScore}`;
}

function getLeaderboardRank(index) {
    if (index === 0) return "#1";
    if (index === 1) return "#2";
    if (index === 2) return "#3";
    return index + 1;
}

function App() {
    const api = window.TapTapApi;

    const engineRef = useRef(null);
    const submitLockRef = useRef(false);
    const profileMenuRef = useRef(null);

    const [user, setUser] = useState(api.getUser());
    const [levels, setLevels] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState("");
    const [activeLevelKey, setActiveLevelKey] = useState("");
    const [snapshot, setSnapshot] = useState(defaultSnapshot());
    const [leaderboard, setLeaderboard] = useState([]);
    const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
    const [statusText, setStatusText] = useState("Press TAP or Space to start scoring.");
    const [errorText, setErrorText] = useState("");
    const [loading, setLoading] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [flexibleTimer, setFlexibleTimer] = useState(20);
    const [flexibleGoal, setFlexibleGoal] = useState(10);
    const [flexibleReady, setFlexibleReady] = useState(false);
    const [savingFlexible, setSavingFlexible] = useState(false);

    const currentLevelLabel = useMemo(() => {
        return formatLevelLabel(activeLevelKey || selectedLevel || "level");
    }, [activeLevelKey, selectedLevel]);

    const stopEngine = useCallback(() => {
        if (engineRef.current) {
            engineRef.current.dispose();
        }
        engineRef.current = null;
    }, []);

    const loadLeaderboards = useCallback(async (levelKey) => {
        try {
            const safeLevel = levelKey || selectedLevel;
            const [levelPayload, globalPayload] = await Promise.all([
                safeLevel
                    ? api.getLeaderboard(GAME_NAME, { level: safeLevel, limit: 10 })
                    : Promise.resolve({ leaderboard: [] }),
                api.getLeaderboard(GAME_NAME, { global: true, limit: 25 })
            ]);

            setLeaderboard(Array.isArray(levelPayload?.leaderboard) ? levelPayload.leaderboard : []);
            setGlobalLeaderboard(Array.isArray(globalPayload?.leaderboard) ? globalPayload.leaderboard : []);
        } catch (err) {
            setErrorText(err.message || "Failed to load leaderboard");
        }
    }, [api, selectedLevel]);

    function renderLeaderboardStars(score) {
        const starCount = Math.min(5, Math.max(1, Math.round((score || 0) / 700)));
        return Array.from({ length: starCount }, (_, index) => (
            <span key={index} className="leaderboard-star">★</span>
        ));
    }

    async function autoSubmit(levelKey, finalSnapshot) {
        if (submitLockRef.current) return;
        submitLockRef.current = true;

        try {
            const result = await api.submitLeaderboard(GAME_NAME, {
                score: finalSnapshot.score || 0,
                reason: finalSnapshot.reason || "FINISHED",
                level: levelKey
            });

            setLeaderboard(Array.isArray(result?.leaderboard) ? result.leaderboard : []);
            setGlobalLeaderboard(Array.isArray(result?.globalLeaderboard) ? result.globalLeaderboard : []);
            setStatusText(
                result?.improved
                    ? `New high score saved for ${formatLevelLabel(levelKey)}.`
                    : "Run finished. Your previous best for this level is still higher."
            );
        } catch (err) {
            setErrorText(err.message || "Failed to save score");
        }
    }

    const startLevel = useCallback(async (levelFile, levelKey = levelFile) => {
        if (!levelFile || !levelKey) return;

        setLoading(true);
        setErrorText("");
        setActiveLevelKey(levelKey);

        try {
            const config = await api.getLevelConfig(GAME_NAME, levelFile);

            stopEngine();
            submitLockRef.current = false;
            setSnapshot(defaultSnapshot());

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
                    void autoSubmit(levelKey, finalSnapshot);
                }
            });

            engine.setGame(game);
            engine.start();
            engineRef.current = engine;
            await loadLeaderboards(levelKey);
        } catch (err) {
            setErrorText(err.message || "Failed to load level");
        } finally {
            setLoading(false);
        }
    }, [api, loadLeaderboards, stopEngine]);

    const applyFlexibleSettings = useCallback(async () => {
        const timerLimit = Math.max(1, Number(flexibleTimer) || 0);
        const targetScore = Math.max(1, Number(flexibleGoal) || 0);

        setSavingFlexible(true);
        setErrorText("");

        try {
            const current = await api.getFlexibleConfig(GAME_NAME);
            const nextConfig = {
                ...current,
                timer: {
                    ...(current?.timer || {}),
                    limit: timerLimit
                },
                winCondition: {
                    ...(current?.winCondition || {}),
                    value: targetScore
                }
            };

            await api.updateFlexibleConfig(GAME_NAME, nextConfig);
            setFlexibleTimer(timerLimit);
            setFlexibleGoal(targetScore);
            setFlexibleReady(true);
            setStatusText(`Flexible level ready: ${timerLimit}s timer and target ${targetScore}.`);
            await startLevel(FLEXIBLE_LEVEL_FILE, createFlexibleLevelKey(timerLimit, targetScore));
        } catch (err) {
            setErrorText(err.message || "Failed to save flexible level");
        } finally {
            setSavingFlexible(false);
        }
    }, [api, flexibleGoal, flexibleTimer, startLevel]);

    useEffect(() => {
        if (!api.requireAuth("/login")) return;

        let active = true;

        async function boot() {
            try {
                const [mePayload, levelPayload, flexiblePayload] = await Promise.all([
                    api.getMe(),
                    api.getLevels(GAME_NAME),
                    api.getFlexibleConfig(GAME_NAME)
                ]);

                if (!active) return;

                setUser(mePayload.user || null);

                const available = levelPayload?.levels || [];
                setLevels(available);

                const timerLimit = Math.max(1, Number(flexiblePayload?.timer?.limit) || 20);
                const targetScore = Math.max(1, Number(flexiblePayload?.winCondition?.value) || 10);
                setFlexibleTimer(timerLimit);
                setFlexibleGoal(targetScore);

                const initialFromQuery = new URLSearchParams(window.location.search).get("level");
                const chosen = initialFromQuery && available.includes(initialFromQuery)
                    ? initialFromQuery
                    : (available[0] || "");

                setSelectedLevel(chosen);

                if (chosen === FLEXIBLE_LEVEL_FILE) {
                    const levelKey = createFlexibleLevelKey(timerLimit, targetScore);
                    setFlexibleReady(true);
                    setActiveLevelKey(levelKey);
                    await loadLeaderboards(levelKey);
                    setStatusText(`Flexible level ready: ${timerLimit}s timer and target ${targetScore}.`);
                } else {
                    setFlexibleReady(false);
                    setActiveLevelKey(chosen);
                    await loadLeaderboards(chosen);
                }
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
    }, [api, loadLeaderboards, stopEngine]);

    useEffect(() => {
        if (!selectedLevel) return;

        if (selectedLevel === FLEXIBLE_LEVEL_FILE) {
            stopEngine();
            setSnapshot(defaultSnapshot());
            const levelKey = createFlexibleLevelKey(flexibleTimer, flexibleGoal);
            setActiveLevelKey(levelKey);
            void loadLeaderboards(levelKey);
            setStatusText("Set your flexible timer and target score, then start the level.");
            return;
        }

        setFlexibleReady(false);
        void startLevel(selectedLevel, selectedLevel);
    }, [selectedLevel, flexibleGoal, flexibleTimer, loadLeaderboards, startLevel, stopEngine]);

    useEffect(() => {
        function onPointerDown(event) {
            if (!profileMenuRef.current?.contains(event.target)) {
                setProfileOpen(false);
            }
        }

        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, []);

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

    const isFlexibleSelected = selectedLevel === FLEXIBLE_LEVEL_FILE;

    function logout() {
        api.logout();
        api.navigate("/login");
    }

    return (
        <div className="tap-shell">
            <div className="tap-shell-glow tap-shell-glow-left"></div>
            <div className="tap-shell-glow tap-shell-glow-right"></div>

            <div className="page">
                <header className="tap-header card">
                    <div className="tap-header-copy">
                        <div className="eyebrow">Tap Tap Arena</div>
                        <h1>Beat the timer and climb the level boards.</h1>
                        <p>Each level has its own leaderboard, and the global board shows the best scores across every Tap level.</p>
                    </div>

                    <div className="tap-header-actions">
                        <button className="secondary" type="button" onClick={() => api.navigate("/home")}>Home</button>
                        <button className="secondary" type="button" onClick={() => api.navigate("/dashboard")}>Dashboard</button>

                        <div className="profile-menu" ref={profileMenuRef}>
                            <button
                                className="profile-trigger"
                                type="button"
                                onClick={() => setProfileOpen((open) => !open)}
                                aria-expanded={profileOpen ? "true" : "false"}
                                aria-label="Open account menu"
                            >
                                <span className="profile-avatar">
                                    <span className="profile-avatar-head"></span>
                                    <span className="profile-avatar-body"></span>
                                </span>
                            </button>

                            {profileOpen ? (
                                <div className="profile-popover">
                                    <div className="profile-popover-name">{user?.username || "Guest"}</div>
                                    <div className="profile-popover-email">{user?.email || "No email"}</div>
                                    <button className="danger ghost-button" type="button" onClick={logout}>Logout</button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </header>

                <section className="card play-panel">
                    <div className="top">
                        <div>
                            <div className="eyebrow">Current Level</div>
                            <h2>{snapshot.gameState?.title || "Tap"}</h2>
                        </div>

                        <div className="level-controls">
                            <select
                                value={selectedLevel}
                                onChange={(event) => setSelectedLevel(event.target.value)}
                                disabled={loading || savingFlexible}
                            >
                                {levels.map((item) => (
                                    <option key={item} value={item}>
                                        {formatLevelLabel(item)}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={() => {
                                    if (isFlexibleSelected) {
                                        void applyFlexibleSettings();
                                    } else {
                                        void startLevel(selectedLevel, selectedLevel);
                                    }
                                }}
                                disabled={loading || savingFlexible}
                            >
                                {isFlexibleSelected ? "Start Flexible" : "Restart"}
                            </button>
                        </div>
                    </div>

                    {isFlexibleSelected ? (
                        <div className="flex-panel">
                            <div className="flex-field">
                                <label htmlFor="flexible-timer">Timer (seconds)</label>
                                <input
                                    id="flexible-timer"
                                    type="number"
                                    min="1"
                                    value={flexibleTimer}
                                    onChange={(event) => setFlexibleTimer(event.target.value)}
                                />
                            </div>

                            <div className="flex-field">
                                <label htmlFor="flexible-goal">Goal / Target Score</label>
                                <input
                                    id="flexible-goal"
                                    type="number"
                                    min="1"
                                    value={flexibleGoal}
                                    onChange={(event) => setFlexibleGoal(event.target.value)}
                                />
                            </div>

                            <div className="flex-note">
                                Flexible scores are saved in a separate leaderboard for each timer and target combination.
                            </div>
                        </div>
                    ) : null}

                    <div className="stats">
                        <div className="stat"><div className="label">Score</div><div className="value">{snapshot.score}</div></div>
                        <div className="stat"><div className="label">Time</div><div className="value">{snapshot.timeLeft}s</div></div>
                        <div className="stat"><div className="label">Goal</div><div className="value">{goalText}</div></div>
                    </div>

                    <div className="status">{statusText}</div>
                    {errorText ? <div className="status error">{errorText}</div> : null}

                    <div className="tap-area">
                        <button
                            className="tap-btn"
                            onClick={handleTap}
                            disabled={snapshot.ended || loading || savingFlexible || (isFlexibleSelected && !flexibleReady)}
                            type="button"
                        >
                            TAP
                        </button>
                        <div className="hint">Press the Space key or hit TAP to score as fast as you can.</div>
                    </div>
                </section>

                <section className="card leaderboard-panel">
                    <div className="leaderboard-heading">
                        <div>
                            <div className="eyebrow">Level Leaderboard</div>
                            <h2>{currentLevelLabel}</h2>
                        </div>
                        <span className="leaderboard-pill">Current Level Only</span>
                    </div>

                    <ol className="leaderboard-list">
                        {leaderboard.length ? leaderboard.map((entry, index) => (
                            <li key={`${entry.username}-${entry.level}-${entry.updatedAt}-${index}`} className="leaderboard-item">
                                <div className={`leaderboard-rank rank-${Math.min(index + 1, 4)}`}>
                                    {getLeaderboardRank(index)}
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
                        )) : (
                            <li className="empty-state">No scores yet for this level. Be the first to set one.</li>
                        )}
                    </ol>
                </section>

                <section className="card leaderboard-panel global-panel">
                    <div className="leaderboard-heading">
                        <div>
                            <div className="eyebrow">Global Leaderboard</div>
                            <h2>All Tap Levels</h2>
                        </div>
                        <span className="leaderboard-pill">All Players</span>
                    </div>

                    <ol className="leaderboard-list">
                        {globalLeaderboard.length ? globalLeaderboard.map((entry, index) => (
                            <li key={`${entry.username}-${entry.level}-${entry.updatedAt}-${index}`} className="leaderboard-item global-item">
                                <div className={`leaderboard-rank rank-${Math.min(index + 1, 4)}`}>
                                    {getLeaderboardRank(index)}
                                </div>
                                <div className="leaderboard-player">
                                    <div className="leaderboard-avatar">{entry.username?.charAt(0)?.toUpperCase() || "?"}</div>
                                    <div className="leaderboard-player-info">
                                        <div className="player-name">{entry.username}</div>
                                        <div className="player-level-tag">{formatLevelLabel(entry.level)}</div>
                                    </div>
                                </div>
                                <div className="leaderboard-score">{entry.score}</div>
                            </li>
                        )) : (
                            <li className="empty-state">No Tap scores have been submitted yet.</li>
                        )}
                    </ol>
                </section>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

