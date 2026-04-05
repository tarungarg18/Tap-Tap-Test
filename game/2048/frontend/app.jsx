const { useCallback, useEffect, useRef, useState } = React;

const GAME_NAME = "2048";
const KEY_TO_DIRECTION = {
    ArrowUp: "up",
    ArrowLeft: "left",
    ArrowDown: "down",
    ArrowRight: "right"
};

function createEmptyBoard(size = 4) {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

function App() {
    const engineRef = useRef(null);
    const submitLockRef = useRef(false);

    const [user, setUser] = useState(window.TapTapApi.getUser());
    const [levels, setLevels] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState("");
    const [loading, setLoading] = useState(false);

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

    const board = snapshot?.gameState?.board || createEmptyBoard(4);
    const boardSize = snapshot?.gameState?.size || 4;
    const gameTitle = snapshot?.gameState?.title || "2048";
    const targetTile = snapshot?.gameState?.targetTile || 0;
    const maxTile = snapshot?.gameState?.maxTile || 0;

    const api = window.TapTapApi;
    const {
        Panel,
        GameHeader,
        GameStats,
        GameBoard,
        LeaderboardPanel
    } = window.TapTap2048Components;

    const stopCurrentEngine = useCallback(() => {
        if (engineRef.current && typeof engineRef.current.dispose === "function") {
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

    async function autoSubmitScore(levelFile, finalSnapshot) {
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
        setStatusText("Initializing game engine...");

        try {
            const config = await api.getLevelConfig(GAME_NAME, levelFile);

            stopCurrentEngine();
            submitLockRef.current = false;

            const gameInstance = new window.Game2048(config);
            const engine = new window.GameEngine(config, {
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
    }, [api, stopCurrentEngine, loadLeaderboard, user]);

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
                await loadLeaderboard();
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
        startLevel(selectedLevel);
    }, [selectedLevel, startLevel]);

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
        startLevel(selectedLevel);
    }

    function logout() {
        api.logout();
        api.navigate("/login");
    }

    return (
        <div className="page">
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                <div style={{ color: "#6b5f55" }}>Signed in as <strong>{user?.username || "-"}</strong></div>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button className="btn-secondary" onClick={() => api.navigate("/home")}>Home</button>
                    <button className="btn-secondary" onClick={() => api.navigate("/dashboard")}>Dashboard</button>
                    <button className="btn-secondary" onClick={logout}>Logout</button>
                </div>
            </div>

            <Panel>
                <GameHeader
                    gameTitle={gameTitle}
                    selectedLevel={selectedLevel}
                    levels={levels}
                    loading={loading}
                    onLevelChange={setSelectedLevel}
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

                <GameBoard board={board} boardSize={boardSize} />

                <div className="controls-hint">
                    Controls: Arrow Up, Arrow Left, Arrow Down, Arrow Right
                </div>
            </Panel>

            <LeaderboardPanel leaderboard={leaderboard} />
        </div>
    );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
