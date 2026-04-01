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
                    <div className="stat"><div className="label">Grid</div><div className="value">{snapshot.gameState?.size}x{snapshot.gameState?.size}</div></div>
                </div>

                <div className="status">{statusText}</div>
                {errorText ? <div className="status error">{errorText}</div> : null}

                <div className="board-wrap">
                    <table className="board">
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

            <section className="card">
                <h2>Leaderboard</h2>
                <ol className="leaderboard-list">
                    {leaderboard.map((entry, index) => (
                        <li key={`${entry.username}-${entry.updatedAt}-${index}`} className="leaderboard-item">
                            <span>{index + 1}</span>
                            <span>{entry.username}</span>
                            <strong>{entry.score}</strong>
                        </li>
                    ))}
                </ol>
            </section>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
