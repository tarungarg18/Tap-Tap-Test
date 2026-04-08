const { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } = React;

const GAME_NAME = "2048";
const FLEX_LEVEL = "flexible.json";
const KEY_TO_DIRECTION = {
    ArrowUp: "up",
    ArrowLeft: "left",
    ArrowDown: "down",
    ArrowRight: "right"
};

const DUMMY_AVATAR =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop offset='0%' stop-color='%23b3d4ff'/%3E%3Cstop offset='100%' stop-color='%238bb0ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='60' cy='60' r='60' fill='url(%23a)'/%3E%3Ccircle cx='60' cy='46' r='24' fill='%23f6fbff'/%3E%3Cpath d='M24 104c6-18 19-30 36-30s30 12 36 30' fill='%23f6fbff'/%3E%3C/svg%3E";

function createEmptyBoard(size = 4) {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

function cleanLevelName(levelFile) {
    return String(levelFile || "").replace(/\.json$/i, "");
}

function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
}

function App() {
    const engineRef = useRef(null);
    const boardWrapRef = useRef(null);
    const submitLockRef = useRef(false);

    const api = window.TapTapApi;
    const { Panel, GameHeader, GameStats, GameBoard, LeaderboardPanel } = window.TapTap2048Components;

    const [user, setUser] = useState(api.getUser());
    const [levels, setLevels] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState("");
    const [loading, setLoading] = useState(false);
    const [boardWidth, setBoardWidth] = useState(520);

    const [snapshot, setSnapshot] = useState({
        score: 0,
        timeLeft: 0,
        message: "",
        reason: "",
        ended: false,
        gameState: {
            title: "2048",
            board: createEmptyBoard(4),
            size: 4,
            targetTile: 2048,
            maxTile: 0
        }
    });

    const [statusText, setStatusText] = useState("Press arrow keys to move");
    const [leaderboard, setLeaderboard] = useState([]);
    const [errorText, setErrorText] = useState("");
    const [avatarOpen, setAvatarOpen] = useState(false);

    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customSettings, setCustomSettings] = useState({
        gridSize: 4,
        targetTile: 128,
        timer: 180
    });

    const board = snapshot?.gameState?.board || createEmptyBoard(4);
    const boardSize = snapshot?.gameState?.size || 4;
    const gameTitle = snapshot?.gameState?.title || "2048";
    const targetTile = snapshot?.gameState?.targetTile || 0;
    const maxTile = snapshot?.gameState?.maxTile || 0;

    const levelLabel = useMemo(() => cleanLevelName(selectedLevel), [selectedLevel]);

    const stopCurrentEngine = useCallback(() => {
        if (engineRef.current && typeof engineRef.current.dispose === "function") {
            engineRef.current.dispose();
        }
        engineRef.current = null;
    }, []);

    const loadLeaderboard = useCallback(
        async (levelFile = selectedLevel) => {
            try {
                const label = cleanLevelName(levelFile);
                const payload = await api.getLeaderboard(GAME_NAME, label ? { level: label } : {});
                setLeaderboard(Array.isArray(payload?.leaderboard) ? payload.leaderboard : []);
            } catch (err) {
                setErrorText(err.message || "Failed to load leaderboard");
            }
        },
        [api, selectedLevel]
    );

    async function autoSubmitScore(levelFile, finalSnapshot) {
        if (submitLockRef.current) return;
        submitLockRef.current = true;

        try {
            const level = cleanLevelName(levelFile);
            const result = await api.submitLeaderboard(GAME_NAME, {
                score: finalSnapshot.score || 0,
                reason: finalSnapshot.reason || "FINISHED",
                level
            });

            await loadLeaderboard(levelFile);
            setStatusText(
                result?.improved
                    ? `New personal best recorded for ${user?.username || "you"}.`
                    : "Run finished — score did not beat your existing record."
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
                const normalized = overrides
                    ? {
                        gridSize: clamp(overrides.gridSize, 3, 8),
                        targetTile: Math.max(8, Number(overrides.targetTile) || config.winCondition?.targetTile || 128),
                        timer: Math.max(30, Number(overrides.timer) || config.timer?.limit || 0)
                    }
                    : null;

                const merged = {
                    ...config,
                    game: {
                        ...(config.game || {}),
                        title: `${config.game?.title || "2048"} (${cleanLevelName(levelFile)})`
                    },
                    gridSize: normalized?.gridSize ?? config.gridSize,
                    timer: {
                        ...(config.timer || {}),
                        limit: normalized?.timer ?? config.timer?.limit ?? 0
                    },
                    winCondition: {
                        ...(config.winCondition || {}),
                        targetTile: normalized?.targetTile ?? config.winCondition?.targetTile
                    }
                };

                stopCurrentEngine();
                submitLockRef.current = false;

                const gameInstance = new window.Game2048(merged);
                const engine = new window.GameEngine(merged, {
                    onRender: (nextSnapshot) => {
                        setSnapshot(nextSnapshot);
                        if (nextSnapshot?.message) {
                            setStatusText(nextSnapshot.message);
                        }
                    },
                    onGameEnd: (finalSnapshot) => {
                        const reasonLabel = finalSnapshot.reason || "FINISHED";
                        setStatusText(`Game ended: ${reasonLabel}`);
                        void autoSubmitScore(levelFile, finalSnapshot);
                    }
                });

                engine.setGame(gameInstance);
                engine.start();
                engineRef.current = engine;
            } catch (err) {
                setErrorText(err.message || "Failed to start level");
                setStatusText("Unable to start game");
            } finally {
                setLoading(false);
            }
        },
        [api, stopCurrentEngine, loadLeaderboard, user]
    );

    useLayoutEffect(() => {
        function measureBoard() {
            if (boardWrapRef.current) {
                const width = boardWrapRef.current.clientWidth;
                if (width) setBoardWidth(width);
            }
        }
        measureBoard();
        window.addEventListener('resize', measureBoard);
        return () => window.removeEventListener('resize', measureBoard);
    }, []);

    useEffect(() => {
        if (!api.requireAuth("/login")) return;

        let active = true;

        async function bootstrap() {
            try {
                const [mePayload, levelsPayload] = await Promise.all([
                    api.getMe(),
                    api.getLevels(GAME_NAME)
                ]);

                if (!active) return;

                setUser(mePayload.user || null);

                const availableLevels = Array.isArray(levelsPayload?.levels) ? levelsPayload.levels : [];
                setLevels(availableLevels);

                const initialFromQuery = new URLSearchParams(window.location.search).get("level");
                const chosen = initialFromQuery && availableLevels.includes(initialFromQuery)
                    ? initialFromQuery
                    : (availableLevels[0] || "");

                setSelectedLevel(chosen);
                await loadLeaderboard(chosen);
            } catch (err) {
                if (!active) return;
                setErrorText(err.message || "Failed to load game");
            }
        }

        bootstrap();

        return () => {
            active = false;
            stopCurrentEngine();
        };
    }, []);

    useEffect(() => {
        if (!selectedLevel) return;
        if (selectedLevel === FLEX_LEVEL) {
            setShowCustomModal(true);
            return;
        }
        startLevel(selectedLevel);
    }, [selectedLevel, startLevel]);

    useEffect(() => {
        if (!selectedLevel) return;
        loadLeaderboard(selectedLevel);
    }, [selectedLevel, loadLeaderboard]);

    useEffect(() => {
        function onKeyDown(event) {
            const direction = KEY_TO_DIRECTION[event.key];
            if (!direction) return;

            event.preventDefault();
            if (engineRef.current) {
                engineRef.current.receiveInput(direction);
            }
        }

        window.addEventListener("keydown", onKeyDown, { passive: false });
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    function restartCurrentLevel() {
        if (!selectedLevel) return;
        if (selectedLevel === FLEX_LEVEL) {
            setShowCustomModal(true);
            return;
        }
        startLevel(selectedLevel);
    }

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
        setCustomSettings((prev) => ({
            ...prev,
            [key]: value
        }));
    }

    function handleCustomSubmit(event) {
        event.preventDefault();
        const normalized = {
            gridSize: clamp(customSettings.gridSize, 3, 8),
            targetTile: Math.max(8, Number(customSettings.targetTile) || 128),
            timer: Math.max(30, Number(customSettings.timer) || 60)
        };
        setCustomSettings(normalized);
        setShowCustomModal(false);
        startLevel(selectedLevel || FLEX_LEVEL, normalized);
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
                <div className="brand-mark">2048</div>
                <div className="nav-actions">
                    <button className="btn-secondary" onClick={() => api.navigate("/home")}>Home</button>
                    <button className="btn-secondary" onClick={() => api.navigate("/dashboard")}>Dashboard</button>
                    <div className="avatar-wrap" onClick={() => setAvatarOpen((v) => !v)}>
                        <div className="avatar-ring">
                            <div
                                className="avatar-photo"
                                style={{ backgroundImage: `url(${DUMMY_AVATAR})` }}
                                aria-label="Open profile menu"
                            ></div>
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

            <Panel>
                <GameHeader
                    gameTitle={gameTitle}
                    selectedLevel={selectedLevel}
                    levels={levels}
                    loading={loading}
                    onLevelChange={handleLevelChange}
                    onRestart={restartCurrentLevel}
                />

                <GameStats
                    score={snapshot.score}
                    timeLeft={snapshot.timeLeft}
                    targetTile={targetTile}
                    maxTile={maxTile}
                />

                <div className="status">{statusText}</div>
                {errorText ? <div className="status error">{errorText}</div> : null}

                <div className="board-wrap" ref={boardWrapRef}>
                    <GameBoard board={board} boardSize={boardSize} availableWidth={boardWidth} />
                </div>

                <div className="controls-hint">
                    Controls: Arrow Up, Arrow Left, Arrow Down, Arrow Right
                </div>
            </Panel>

            <LeaderboardPanel leaderboard={leaderboard} levelLabel={levelLabel} />

            {showCustomModal ? (
                <div className="overlay" onClick={handleCustomCancel}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Flexible settings</h3>
                        <p style={{ marginTop: 0 }}>Choose your grid, target tile, and timer before starting.</p>
                        <form onSubmit={handleCustomSubmit} className="custom-form">
                            <label className="field">
                                <span>Grid size (4-8)</span>
                                <input
                                    type="number"
                                    min="4"
                                    max="8"
                                    value={customSettings.gridSize}
                                    onChange={(e) => handleCustomInput("gridSize", e.target.value)}
                                />
                            </label>
                            <label className="field">
                                <span>Target tile</span>
                                <input
                                    type="number"
                                    min="8"
                                    step="8"
                                    value={customSettings.targetTile}
                                    onChange={(e) => handleCustomInput("targetTile", e.target.value)}
                                />
                            </label>
                            <label className="field">
                                <span>Timer (seconds)</span>
                                <input
                                    type="number"
                                    min="30"
                                    step="10"
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

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);

