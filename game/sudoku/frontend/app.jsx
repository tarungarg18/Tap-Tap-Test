const { useCallback, useEffect, useRef, useState } = React;

const GAME_NAME = "sudoku";

function emptyBoard() {
    return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 0));
}

function defaultSnapshot() {
    return {
        score: 0,
        timeLeft: 0,
        message: "",
        reason: "",
        ended: false,
        config: {},
        gameState: {
            title: "Sudoku",
            board: emptyBoard(),
            size: 9,
            inputFormat: "",
            separator: ","
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
    const [statusText, setStatusText] = useState("Fill puzzle using row, col, value");
    const [errorText, setErrorText] = useState("");
    const [loading, setLoading] = useState(false);
    const [gridSizerOpen, setGridSizerOpen] = useState(false);
    const [cellSizeInput, setCellSizeInput] = useState("40");
    const [cellSize, setCellSize] = useState(40);

    const [form, setForm] = useState({ r: "", c: "", v: "" });

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
            await api.submitLeaderboard(GAME_NAME, {
                score: finalSnapshot.score || 0,
                reason: finalSnapshot.reason || "FINISHED",
                level: levelFile
            });
            await loadLeaderboard();
            setStatusText(`Score saved for ${user?.username || "user"}`);
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

            const game = new window.SudokuGame(config);
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

    function updateForm(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function applyMove(event) {
        event?.preventDefault?.();

        if (!engineRef.current || snapshot.ended) return;

        const separator = snapshot.config?.input?.separator;
        if (!separator) return;

        const raw = [form.r, form.c, form.v].join(separator);
        engineRef.current.receiveInput(raw);
    }

    function applyGridSize(event) {
        event?.preventDefault?.();
        const next = Number(cellSizeInput);
        if (!Number.isFinite(next) || next < 24 || next > 72) {
            setErrorText("Grid cell size must be between 24 and 72.");
            return;
        }

        setErrorText("");
        setCellSize(next);
        setGridSizerOpen(false);
    }

    const board = snapshot.gameState?.board || emptyBoard();

    function logout() {
        api.logout();
        window.location.href = "/login";
    }

    return (
        <div className="page">
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                <div style={{ color: "#4c5b89" }}>Signed in as <strong>{user?.username || "-"}</strong></div>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button className="secondary" onClick={() => (window.location.href = "/home")}>Home</button>
                    <button className="secondary" onClick={() => (window.location.href = "/dashboard")}>Dashboard</button>
                    <button className="secondary" onClick={logout}>Logout</button>
                </div>
            </div>

            <section className="card">
                <div className="top">
                    <h1>{snapshot.gameState?.title || "Sudoku"}</h1>
                    <div className="top-actions">
                        <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} disabled={loading}>
                            {levels.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <button style={{ marginLeft: "8px" }} onClick={() => startLevel(selectedLevel)} disabled={loading}>Restart</button>
                        <button
                            type="button"
                            className="icon-grid-button"
                            title="Custom grid size"
                            onClick={() => setGridSizerOpen((value) => !value)}
                        >
                            <span className="grid-icon" aria-hidden="true"></span>
                        </button>
                    </div>
                </div>

                <div className="stats">
                    <div className="stat"><div className="label">Score</div><div className="value">{snapshot.score}</div></div>
                    <div className="stat"><div className="label">Time</div><div className="value">{snapshot.timeLeft}s</div></div>
                    <div className="stat"><div className="label">Grid</div><div className="value">{snapshot.gameState?.size}x{snapshot.gameState?.size}</div></div>
                </div>

                <div className="status">{statusText}</div>
                {errorText ? <div className="status error">{errorText}</div> : null}

                {gridSizerOpen ? (
                    <form className="grid-size-panel" onSubmit={applyGridSize}>
                        <label htmlFor="grid-size-input">Custom grid size</label>
                        <div className="grid-size-row">
                            <input
                                id="grid-size-input"
                                type="number"
                                min="24"
                                max="72"
                                value={cellSizeInput}
                                onChange={(e) => setCellSizeInput(e.target.value)}
                                placeholder="Cell px"
                            />
                            <button type="submit">Apply</button>
                        </div>
                        <div className="hint">Set cell size from 24 to 72 pixels.</div>
                    </form>
                ) : null}

                <div className="board-wrap">
                    <table className="board" style={{ "--cell-size": `${cellSize}px` }}>
                        <tbody>
                            {board.map((row, rIdx) => (
                                <tr key={rIdx}>
                                    {row.map((cell, cIdx) => (
                                        <td
                                            key={`${rIdx}-${cIdx}`}
                                            className={cell !== 0 ? "prefilled" : ""}
                                            onClick={() => setForm((prev) => ({ ...prev, r: String(rIdx), c: String(cIdx) }))}
                                        >
                                            {cell === 0 ? "" : cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <form className="form" onSubmit={applyMove}>
                    <input type="number" placeholder="row" value={form.r} onChange={(e) => updateForm("r", e.target.value)} />
                    <input type="number" placeholder="col" value={form.c} onChange={(e) => updateForm("c", e.target.value)} />
                    <input type="number" placeholder="value" value={form.v} onChange={(e) => updateForm("v", e.target.value)} />
                    <button type="submit" disabled={snapshot.ended}>Apply</button>
                </form>

                <div className="hint">Input format from JSON: {snapshot.gameState?.inputFormat}</div>
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
