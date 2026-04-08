const { useCallback, useEffect, useMemo, useRef, useState } = React;

const GAME_NAME = "sudoku";
const FLEX_LEVEL = "flexible.json";
const DUMMY_AVATAR =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop offset='0%' stop-color='%23b3d4ff'/%3E%3Cstop offset='100%' stop-color='%238bb0ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='60' cy='60' r='60' fill='url(%23a)'/%3E%3Ccircle cx='60' cy='46' r='24' fill='%23f6fbff'/%3E%3Cpath d='M24 104c6-18 19-30 36-30s30 12 36 30' fill='%23f6fbff'/%3E%3C/svg%3E";

function cleanLevelName(levelFile) {
    return String(levelFile || "").replace(/\.json$/i, "");
}

function emptyBoard(size = 9) {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

function generateFlexiblePuzzle(size) {
    const nums = Array.from({ length: size }, (_, i) => i + 1);
    const solution = Array.from({ length: size }, (_, r) => nums.map((_, c) => nums[(c + r) % size]));

    for (let i = 0; i < size; i++) {
        const r1 = Math.floor(Math.random() * size);
        const r2 = Math.floor(Math.random() * size);
        [solution[r1], solution[r2]] = [solution[r2], solution[r1]];
    }
    for (let c = 0; c < size; c++) {
        const c1 = Math.floor(Math.random() * size);
        const c2 = Math.floor(Math.random() * size);
        for (let r = 0; r < size; r++) {
            [solution[r][c1], solution[r][c2]] = [solution[r][c2], solution[r][c1]];
        }
    }

    const board = solution.map((row) => row.map((val) => (Math.random() < 0.45 ? val : 0)));
    return { board, solution };
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

function computeCellSize(gridSize) {
    const size = Math.max(3, Number(gridSize) || 9);
    return Math.max(28, Math.min(60, Math.floor(420 / size)));
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
    const [cellSize, setCellSize] = useState(40);
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customSettings, setCustomSettings] = useState({ gridSize: 9 });
    const [avatarOpen, setAvatarOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [form, setForm] = useState({ r: "", c: "", v: "" });

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
                const label = cleanLevelName(levelFile || selectedLevel);
                const payload = await api.getLeaderboard(GAME_NAME, label ? { level: label } : {});
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
                    : "Run finished - score did not beat your existing record."
            );
        } catch (err) {
            setErrorText(err.message || "Failed to save score");
        }
    }

    const startLevel = useCallback(async (levelFile, overrides = null) => {
        if (!levelFile) return;

        setLoading(true);
        setErrorText("");
        setSelectedCell(null);
        setForm({ r: "", c: "", v: "" });

        try {
            const config = await api.getLevelConfig(GAME_NAME, levelFile);
            const merged = { ...config };

            if (overrides) {
                if (overrides.board && overrides.solution) {
                    merged.board = overrides.board;
                    merged.solution = overrides.solution;
                    merged.gridSize = overrides.gridSize || overrides.board.length;
                }
                if (overrides.gridSize) {
                    merged.game = { ...(merged.game || {}), title: `Sudoku ${overrides.gridSize}x${overrides.gridSize}` };
                }
            }

            const effectiveGrid = merged.gridSize || merged.board?.length || 9;
            setCellSize(computeCellSize(effectiveGrid));

            stopEngine();
            submitLockRef.current = false;
            setSnapshot(defaultSnapshot());

            const game = new window.SudokuGame(merged);
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
    }, [api, loadLeaderboard, stopEngine]);

    // keep URL in sync so refresh preserves selection
    useEffect(() => {
        if (!selectedLevel) return;
        const url = new URL(window.location.href);
        url.searchParams.set("level", selectedLevel);
        window.history.replaceState({}, "", url.toString());
    }, [selectedLevel]);

    useEffect(() => {
        if (!selectedLevel) return;
        if (cleanLevelName(selectedLevel) === "flexible") {
            setShowCustomModal(true);
            return;
        }
        startLevel(selectedLevel);
    }, [selectedLevel, startLevel]);

    useEffect(() => {
        if (!selectedLevel) return;
        loadLeaderboard(selectedLevel);
    }, [selectedLevel, loadLeaderboard]);

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

    useEffect(() => {
        function onKeyDown(e) {
            const tag = e.target?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if (!selectedCell || snapshot.ended) return;
            if (!/^\d$/.test(e.key)) return;
            const val = Number(e.key);
            if (val <= 0) return;
            const separator = snapshot.config?.input?.separator;
            if (!separator || !engineRef.current) return;
            const raw = [selectedCell.r, selectedCell.c, val].join(separator);
            engineRef.current.receiveInput(raw);
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selectedCell, snapshot.ended, snapshot.config]);

    const board = snapshot.gameState?.board || emptyBoard();

    function logout() {
        api.logout();
        api.navigate("/login");
    }

    function handleLevelChange(val) {
        setSelectedLevel(val);
        if (cleanLevelName(val) === "flexible") {
            setShowCustomModal(true);
        }
    }

    function handleCustomSubmit(event) {
        event?.preventDefault?.();
        const grid = Math.max(3, Math.min(12, Number(customSettings.gridSize) || 9));
        setCustomSettings({ gridSize: grid });
        setShowCustomModal(false);

        const puzzle = generateFlexiblePuzzle(grid);
        startLevel(selectedLevel || FLEX_LEVEL, {
            gridSize: grid,
            board: puzzle.board,
            solution: puzzle.solution
        });
    }

    function handleCustomInput(key, value) {
        setCustomSettings((prev) => ({ ...prev, [key]: value }));
    }

    return (
        <div className="page">
            <div className="page-nav">
                <div className="brand-mark">Sudoku</div>
                <div className="nav-actions">
                    <button className="secondary" onClick={() => api.navigate("/home")}>Home</button>
                    <button className="secondary" onClick={() => api.navigate("/dashboard")}>Dashboard</button>
                    <div className="avatar-wrap" onClick={() => setAvatarOpen((v) => !v)}>
                        <div className="avatar-ring">
                            <div className="avatar-photo" style={{ backgroundImage: `url(${DUMMY_AVATAR})` }} aria-label="Open profile menu"></div>
                            <div className="avatar-initial">{(user?.username || "P").charAt(0).toUpperCase()}</div>
                        </div>
                        {avatarOpen ? (
                            <div className="avatar-menu">
                                <div className="avatar-name">{user?.username || "Player"}</div>
                                <div className="avatar-email">Signed in</div>
                                <button className="secondary" onClick={() => api.navigate("/dashboard")}>View dashboard</button>
                                <button className="danger" onClick={logout}>Logout</button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            <section className="card">
                <div className="top">
                    <h1>{snapshot.gameState?.title || "Sudoku"}</h1>
                    <div className="top-actions">
                        <select
                            value={selectedLevel}
                            onChange={(e) => handleLevelChange(e.target.value)}
                            disabled={loading}
                        >
                            {levels.map((item) => {
                                const label = cleanLevelName(item);
                                return <option key={item} value={item}>{label}</option>;
                            })}
                        </select>
                        <button
                            style={{ marginLeft: "8px" }}
                            onClick={() => {
                                if (cleanLevelName(selectedLevel) === "flexible") {
                                    setShowCustomModal(true);
                                    return;
                                }
                                startLevel(selectedLevel);
                            }}
                            disabled={loading}
                        >Restart</button>
                    </div>
                </div>

                <div className="stats">
                    <div className="stat"><div className="label">Score</div><div className="value">{snapshot.score}</div></div>
                    <div className="stat"><div className="label">Time</div><div className="value">{snapshot.timeLeft}s</div></div>
                    <div className="stat"><div className="label">Grid</div><div className="value">{snapshot.gameState?.size}x{snapshot.gameState?.size}</div></div>
                </div>

                <div className="status">{statusText}</div>
                {errorText ? <div className="status error">{errorText}</div> : null}

                <div className="board-wrap">
                    <table className="board" style={{ "--cell-size": `${cellSize}px` }}>
                        <tbody>
                            {board.map((row, rIdx) => (
                                <tr key={rIdx}>
                                    {row.map((cell, cIdx) => (
                                        <td
                                            key={`${rIdx}-${cIdx}`}
                                            className={(cell !== 0 ? "prefilled " : "") + (selectedCell?.r === rIdx && selectedCell?.c === cIdx ? "selected" : "")}
                                            onClick={() => {
                                                setSelectedCell({ r: rIdx, c: cIdx });
                                                setForm((prev) => ({ ...prev, r: String(rIdx), c: String(cIdx) }));
                                            }}
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
                                    {entry.level ? <div className="player-level">Level: {cleanLevelName(entry.level)}</div> : null}
                                </div>
                            </div>
                            <div className="leaderboard-score">{entry.score}</div>
                        </li>
                    ))}
                </ol>
            </section>

            {showCustomModal ? (
                <div className="overlay" onClick={() => setShowCustomModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Flexible settings</h3>
                        <p style={{ marginTop: 0 }}>Choose board size (3-12). A fresh puzzle will be generated for you.</p>
                        <form onSubmit={handleCustomSubmit} className="custom-form">
                            <label className="field">
                                <span>Board size (N x N)</span>
                                <input
                                    type="number"
                                    min="3"
                                    max="12"
                                    value={customSettings.gridSize}
                                    onChange={(e) => handleCustomInput("gridSize", e.target.value)}
                                />
                            </label>
                            <div className="modal-actions">
                                <button className="secondary" type="button" onClick={() => setShowCustomModal(false)}>Cancel</button>
                                <button type="submit">Start</button>
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