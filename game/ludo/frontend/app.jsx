const { useCallback, useEffect, useMemo, useRef, useState } = React;

const ANIMATION_STEP_MS = 140;
const ROLL_ANIM_MS = 700;
const ROLL_TICK_MS = 70;

const COLOR_OPTIONS = [
    { key: "red", label: "Red" },
    { key: "green", label: "Green" },
    { key: "yellow", label: "Yellow" },
    { key: "blue", label: "Blue" }
];

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultGameState() {
    return {
        title: "Ludo",
        trackLength: 52,
        homeLength: 6,
        tokensPerPlayer: 4,
        safeCells: [1, 9, 14, 22, 27, 35, 40, 48],
        turnNumber: 1,
        currentPlayerId: "",
        currentPlayerName: "",
        pendingRoll: null,
        lastRoll: null,
        winner: null,
        gameOver: false,
        players: []
    };
}

function buildProgressSteps(fromProgress, toProgress) {
    if (!Number.isFinite(fromProgress) || !Number.isFinite(toProgress)) return [];
    if (fromProgress === toProgress) return [];
    if (fromProgress === -1) {
        const steps = [];
        for (let p = 0; p <= toProgress; p += 1) steps.push(p);
        return steps;
    }
    if (toProgress < fromProgress) return [toProgress];
    const steps = [];
    for (let p = fromProgress + 1; p <= toProgress; p += 1) steps.push(p);
    return steps;
}

function validateSetupRows(rows, count) {
    if (!Array.isArray(rows) || rows.length < 2) throw new Error("Need at least 2 players");
    const trimmed = rows.slice(0, count);
    const colors = trimmed.map((r) => r.colorKey);
    if (new Set(colors).size !== trimmed.length) throw new Error("Each player must choose a different color.");
}

function getTokenOrRedirect() {
    const token = window.TapTapApi?.getToken?.();
    if (!token) {
        window.location.href = "/login";
        return null;
    }
    return token;
}

function App() {
    const { TopBar, GameHeader, LudoBoard } = window.TapTapLudoComponents;

    const gameRef = useRef(null);
    const socketRef = useRef(null);
    const lastOnlineStateRef = useRef(null);

    const [mode, setMode] = useState("online"); 
    const [view, setView] = useState("lobby"); 

    
    const [playerCountLocal, setPlayerCountLocal] = useState(4);
    const [setupRows, setSetupRows] = useState([
        { name: "", colorKey: "red" },
        { name: "", colorKey: "green" },
        { name: "", colorKey: "yellow" },
        { name: "", colorKey: "blue" }
    ]);
    const [gameState, setGameState] = useState(defaultGameState());
    const [phase, setPhase] = useState("setup");
    const [statusText, setStatusText] = useState("Enter names, pick colors, then start.");
    const [errorText, setErrorText] = useState("");
    const [diceRolling, setDiceRolling] = useState(false);
    const [diceFace, setDiceFace] = useState(null);
    const [animationOverrides, setAnimationOverrides] = useState({});
    const [actionBusy, setActionBusy] = useState(false);

    
    const [socketReady, setSocketReady] = useState(false);
    const [socketError, setSocketError] = useState("");
    const [roomState, setRoomState] = useState(null);
    const [roomMessage, setRoomMessage] = useState("Waiting for players");
    const [createCount, setCreateCount] = useState(2);
    const [joinRoomId, setJoinRoomId] = useState("");
    const [desiredColor, setDesiredColor] = useState("");
    const [onlineDiceFace, setOnlineDiceFace] = useState(null);
    const [onlineDiceRolling, setOnlineDiceRolling] = useState(false);

    const user = window.TapTapApi?.getUser?.() || null;

    const isPlayingLocal = view === "play" && mode === "local";
    const hasPendingRoll = gameState.pendingRoll !== null && gameState.pendingRoll !== undefined;
    const canRollBoard =
        isPlayingLocal &&
        !gameState.gameOver &&
        !diceRolling &&
        !actionBusy &&
        !hasPendingRoll;

    const mySeat = useMemo(() => {
        if (!roomState || !user) return null;
        return (roomState.seats || []).find((seat) => seat.userId === user.id);
    }, [roomState, user]);
    const onlineGameState = roomState?.gameState || null;
    const isHost = roomState?.hostUserId === user?.id;
    const isMyTurnOnline = Boolean(onlineGameState && mySeat && mySeat.colorKey === onlineGameState.currentPlayerId && !onlineGameState.gameOver);

    const availableColors = useMemo(() => {
        const avail = roomState?.availableColors || [];
        const mine = mySeat?.colorKey ? [{ colorKey: mySeat.colorKey, displayName: mySeat.displayName || mySeat.colorKey, color: mySeat.color }] : [];
        const merged = [...mine, ...avail];
        const seen = new Set();
        return merged.filter((item) => {
            const key = item.colorKey;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [roomState, mySeat]);

    
    useEffect(() => {
        if (mode !== "online") return;
        const token = getTokenOrRedirect();
        if (!token) return;
        if (!window.io) {
            setSocketError("Socket.io client not loaded.");
            return;
        }

        const socket = window.io({ auth: { token } });
        socketRef.current = socket;

        socket.on("connect", () => {
            setSocketReady(true);
            setSocketError("");
        });

        socket.on("connect_error", (err) => {
            setSocketReady(false);
            setSocketError(err.message || "Socket connection failed");
        });

        socket.on("ludo:connected", () => {
            setSocketReady(true);
        });

                socket.on("ludo:roomState", async (state) => {
            const prevState = lastOnlineStateRef.current;
            const nextState = state?.gameState || null;

            if (nextState && prevState) {
                if (Number(nextState.pendingRoll) !== Number(prevState.pendingRoll) && nextState.pendingRoll != null) {
                    await playOnlineDiceAnimation(Number(nextState.pendingRoll));
                } else if (Number(nextState.lastRoll) !== Number(prevState.lastRoll) && nextState.pendingRoll == null) {
                    setOnlineDiceFace(Number(nextState.lastRoll));
                }
                await animateOnlineMovement(prevState, nextState);
            } else if (nextState && nextState.pendingRoll != null) {
                await playOnlineDiceAnimation(Number(nextState.pendingRoll));
            }

            if (nextState) {
                lastOnlineStateRef.current = nextState;
            }
            setRoomState(state);
            setRoomMessage(state?.lastAction?.message || "Waiting for players?");
            if (state?.status === "playing") {
                setView("play");
            }
        });

        socket.on("ludo:error", (payload) => {
            setSocketError(payload?.message || "Room error");
        });

        return () => {
            socket.disconnect();
            setSocketReady(false);
        };
    }, [mode]);

    
    async function animateOnlineMovement(prevState, nextState) {
        if (!prevState || !nextState) return;
        try {
            const prevPlayers = Array.isArray(prevState.players) ? prevState.players : [];
            const nextPlayers = Array.isArray(nextState.players) ? nextState.players : [];
            const prevMap = new Map();
            prevPlayers.forEach((p) => {
                (p.tokens || []).forEach((t, idx) => prevMap.set(`${p.id}-${idx + 1}`, Number(t.progress)));
            });
            const deltas = [];
            nextPlayers.forEach((p) => {
                (p.tokens || []).forEach((t, idx) => {
                    const key = `${p.id}-${idx + 1}`;
                    const prevProgress = prevMap.get(key);
                    const nextProgress = Number(t.progress);
                    if (Number.isFinite(prevProgress) && Number.isFinite(nextProgress) && prevProgress !== nextProgress) {
                        deltas.push({ key, fromProgress: prevProgress, toProgress: nextProgress });
                    }
                });
            });
            if (!deltas.length) return;
            for (const delta of deltas) {
                const steps = buildProgressSteps(delta.fromProgress, delta.toProgress);
                for (const progress of steps) {
                    setAnimationOverrides({ [delta.key]: progress });
                    await sleep(ANIMATION_STEP_MS);
                }
            }
            setAnimationOverrides({});
        } catch (err) {
            console.error("online animation error", err);
            setAnimationOverrides({});
        }
    }
    async function playOnlineDiceAnimation(value) {
        try {
            setOnlineDiceRolling(true);
            let tick = null;
            try {
                tick = setInterval(() => {
                    setOnlineDiceFace(1 + Math.floor(Math.random() * 6));
                }, ROLL_TICK_MS);
                await sleep(ROLL_ANIM_MS);
            } finally {
                if (tick) clearInterval(tick);
            }
            setOnlineDiceFace(value);
        } finally {
            setOnlineDiceRolling(false);
        }
    }

    const resetAll = useCallback(() => {
        gameRef.current = null;
        setActionBusy(false);
        setPhase("setup");
        setView("lobby");
        setGameState(defaultGameState());
        setStatusText("Enter names, pick colors, then start.");
        setErrorText("");
        setDiceRolling(false);
        setDiceFace(null);
        setAnimationOverrides({});
    }, []);

    function updateSetupRow(index, patch) {
        setSetupRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    }

    function startMatch() {
        const activeRows = setupRows.slice(0, playerCountLocal);
        try {
            setErrorText("");
            validateSetupRows(activeRows, playerCountLocal);
            const game = window.LudoGame.createLocalFourPlayer(activeRows);
            game.init();
            gameRef.current = game;
            const initial = game.getState();
            setGameState(initial);
            setPhase("play");
            setView("play");
            setDiceFace(null);
            setStatusText("");
        } catch (err) {
            setErrorText(err.message || "Could not start game.");
        }
    }

    const handleRoll = useCallback(async () => {
        const game = gameRef.current;
        if (!game || game.gameOver || diceRolling || actionBusy) return;
        if (game.pendingRoll !== null) return;

        setErrorText("");
        setDiceRolling(true);

        let tick = null;
        try {
            tick = setInterval(() => {
                setDiceFace(1 + Math.floor(Math.random() * 6));
            }, ROLL_TICK_MS);
            await sleep(ROLL_ANIM_MS);
        } finally {
            if (tick) clearInterval(tick);
        }

        try {
            const out = game.handleInput("roll");
            const next = game.getState();
            setGameState(next);
            setDiceFace(next.lastRoll);
            setStatusText(out.message || "");

            if (out.type === "INVALID") {
                setErrorText(out.message || "");
            }

            if (game.gameOver && out.type === "WIN") {
                setPhase("finished");
            }
        } finally {
            setDiceRolling(false);
        }
    }, [diceRolling, actionBusy]);

    const runMoveAnimation = useCallback(async (movement) => {
        if (!movement) return;
        const tokenKey = `${movement.playerId}-${movement.tokenNumber}`;
        const fromProgress = Number(movement.fromProgress);
        const toProgress = Number(movement.toProgress);
        const steps = buildProgressSteps(fromProgress, toProgress);
        for (const progress of steps) {
            setAnimationOverrides({ [tokenKey]: progress });
            await sleep(ANIMATION_STEP_MS);
        }
        setAnimationOverrides({});
    }, []);

    const handleMove = useCallback(
        async (tokenNumber) => {
            const game = gameRef.current;
            if (!game || game.gameOver || diceRolling || actionBusy) return;
            if (game.pendingRoll === null) return;

            setActionBusy(true);
            setErrorText("");

            const out = game.handleInput(String(tokenNumber));

            if (out.type === "INVALID") {
                setErrorText(out.message || "");
                setActionBusy(false);
                return;
            }

            await runMoveAnimation(out.movement);
            const next = game.getState();
            setGameState(next);
            setStatusText(out.message || "");

            if (game.gameOver && out.type === "WIN") {
                setPhase("finished");
            }

            setActionBusy(false);
        },
        [diceRolling, actionBusy, runMoveAnimation]
    );

    
    function ensureSocket() {
        if (!socketRef.current || !socketReady) {
            setSocketError("Socket not connected.");
            return null;
        }
        return socketRef.current;
    }

    function createRoom() {
        const socket = ensureSocket();
        if (!socket) return;
        setSocketError("");
        socket.emit("ludo:createRoom", { playerCount: createCount, colorKey: desiredColor || undefined }, (resp) => {
            if (!resp?.ok) {
                setSocketError(resp?.error || "Create failed");
                return;
            }
            setRoomMessage(`Room ${resp.roomId} created`);
        });
    }

    function joinRoom(targetRoomId) {
        const socket = ensureSocket();
        if (!socket) return;
        const roomId = targetRoomId || joinRoomId;
        if (!roomId) {
            setSocketError("Room ID required");
            return;
        }
        setSocketError("");
        socket.emit("ludo:joinRoom", { roomId, colorKey: desiredColor || undefined }, (resp) => {
            if (!resp?.ok) {
                setSocketError(resp?.error || "Join failed");
                return;
            }
            setRoomMessage(`Joined room ${roomId}`);
        });
    }

    function leaveRoom() {
        const socket = ensureSocket();
        if (!socket) return;
        socket.emit("ludo:leaveRoom", {}, () => {
            setRoomState(null);
            setRoomMessage("Left room");
            setView("lobby");
        });
    }

    function changeColor(colorKey) {
        if (!roomState?.roomId) return;
        setDesiredColor(colorKey);
        joinRoom(roomState.roomId);
    }

    function startOnlineMatch() {
        const socket = ensureSocket();
        if (!socket || !roomState?.roomId) return;
        socket.emit("ludo:start", {}, (resp) => {
            if (!resp?.ok) {
                setSocketError(resp?.error || "Start failed");
            } else {
                setView("play");
            }
        });
    }

    function handleOnlineRoll() {
        const socket = ensureSocket();
        if (!socket) return;
        if (!isMyTurnOnline) return;
        socket.emit("ludo:roll", {}, (resp) => {
            if (!resp?.ok) setSocketError(resp?.error || "Roll failed");
        });
    }

    function handleOnlineMove(tokenNumber) {
        const socket = ensureSocket();
        if (!socket) return;
        if (!isMyTurnOnline) return;
        socket.emit("ludo:move", { tokenNumber }, (resp) => {
            if (!resp?.ok) setSocketError(resp?.error || "Move failed");
        });
    }

    const standings = useMemo(() => {
        const players = Array.isArray(gameState.players) ? gameState.players : [];
        return players.slice().sort((a, b) => (Number(b.finishedTokens) || 0) - (Number(a.finishedTokens) || 0));
    }, [gameState.players]);

    
    const activeSetupRows = setupRows.slice(0, playerCountLocal);

    function renderLocalSetup() {
        return (
            <section className="card setup-card slide-in">
                <div className="setup-header-row">
                    <h1 className="setup-title">Ludo  Local ({playerCountLocal} players)</h1>
                </div>

                <p className="setup-lead muted">Pass the device. Pick unique colors. First turn follows the list order.</p>

                <div className="setup-grid">
                    {activeSetupRows.map((row, index) => {
                        const taken = new Set(activeSetupRows.map((r, i) => (i === index ? null : r.colorKey)).filter(Boolean));
                        return (
                            <div key={index} className="setup-row">
                                <div className="setup-row-label">Player {index + 1}</div>
                                <input
                                    className="setup-input"
                                    type="text"
                                    placeholder={`Name ${index + 1}`}
                                    value={row.name}
                                    onChange={(e) => updateSetupRow(index, { name: e.target.value })}
                                    maxLength={24}
                                />
                                <select
                                    className="setup-select"
                                    value={row.colorKey}
                                    onChange={(e) => updateSetupRow(index, { colorKey: e.target.value })}
                                >
                                    {COLOR_OPTIONS.map((opt) => (
                                        <option key={opt.key} value={opt.key} disabled={taken.has(opt.key)}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        );
                    })}
                </div>

                {errorText ? <div className="error setup-error">{errorText}</div> : null}

                <div className="setup-actions">
                    <button type="button" className="btn btn-roll" onClick={startMatch}>
                        Start game
                    </button>
                </div>
            </section>
        );
    }

    function renderOnlineLobby() {
        const seats = roomState?.seats || [];
        const status = roomState?.status || "waiting";
        const filled = seats.filter((s) => s.occupied).length;
        const readyToStart = isHost && status === "waiting" && filled === (roomState?.playerCount || createCount);
        return (
            <section className="card setup-card slide-in">
                <div className="setup-header-row">
                    <h1 className="setup-title">Ludo Online</h1>
                    <div className={`socket-state ${socketReady ? "online" : "offline"}`}>
                        {socketReady ? "Connected" : "Offline"}
                    </div>
                </div>

                <div className="online-grid">
                    <div className="online-column">
                        <div className="form-row">
                            <label>Players</label>
                            <select value={createCount} onChange={(e) => setCreateCount(Number(e.target.value) || 2)}>
                                {[2, 3, 4].map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-row">
                            <label>Preferred Color</label>
                            <select value={desiredColor} onChange={(e) => setDesiredColor(e.target.value)}>
                                <option value="">Any</option>
                                {COLOR_OPTIONS.map((opt) => (
                                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <button className="btn btn-roll" type="button" onClick={createRoom} disabled={!socketReady}>
                            Create Room
                        </button>

                        <hr />
                        <div className="form-row">
                            <label>Room ID</label>
                            <input
                                type="text"
                                value={joinRoomId}
                                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                                placeholder="ABC123"
                            />
                        </div>
                        <button className="btn btn-secondary" type="button" onClick={() => joinRoom()} disabled={!socketReady}>
                            Join Room
                        </button>
                        {roomState?.roomId ? (
                            <button className="btn btn-secondary" type="button" onClick={leaveRoom} style={{ marginLeft: "6px" }}>
                                Leave Room
                            </button>
                        ) : null}
                        {roomState?.roomId ? (
                            <div className="muted" style={{ marginTop: "8px" }}>
                                Share Room ID: <strong>{roomState.roomId}</strong>
                            </div>
                        ) : null}
                    </div>

                    <div className="online-column">
                        <div className="online-seats">
                            <div className="online-seats-header">
                                <strong>Seats</strong>
                                <span className="muted">{filled}/{roomState?.playerCount || createCount}</span>
                            </div>
                            {seats.length === 0 ? <div className="muted">Create or join a room</div> : null}
                            {seats.map((seat) => {
                                const mine = seat.userId === user?.id;
                                const color = seat.colorKey || "--";
                                return (
                                    <div key={seat.seatIndex} className={`seat-row ${mine ? "seat-row-own" : ""}`}>
                                        <div className="seat-meta">
                                            <div className="seat-name">Seat {seat.seatIndex + 1}</div>
                                            <div className="seat-user muted">{seat.username || "Waiting"}</div>
                                        </div>
                                        {mine ? (
                                            <select
                                                value={color}
                                                onChange={(e) => changeColor(e.target.value)}
                                                className="seat-select"
                                            >
                                                {availableColors.map((opt) => (
                                                    <option key={opt.colorKey} value={opt.colorKey}>
                                                        {opt.displayName || opt.colorKey}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="seat-color-pill">{color.toUpperCase()}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="muted" style={{ marginTop: "8px" }}>
                            {roomMessage || (status === "waiting" ? "Waiting for players" : status)}
                        </div>
                        {socketError ? <div className="error" style={{ marginTop: "6px" }}>{socketError}</div> : null}
                        {readyToStart ? (
                            <button className="btn btn-roll" type="button" style={{ marginTop: "10px" }} onClick={startOnlineMatch}>
                                Start Match
                            </button>
                        ) : null}
                    </div>
                </div>
            </section>
        );
    }

    const renderBoard = (state, online = false) => {
        if (!state) return null;
        const canRollOnline = online && isMyTurnOnline && state.pendingRoll === null;
        return (
            <div className="play-layout fade-in">
                <LudoBoard
                    gameState={state}
                    movableTokens={state.movableTokens || []}
                    ended={Boolean(state.gameOver)}
                    onTokenClick={online ? handleOnlineMove : handleMove}
                    myColorKey={online ? (mySeat?.colorKey || "") : state.currentPlayerId}
                    animationOverrides={animationOverrides}
                    diceFace={online ? (onlineDiceFace ?? state.lastRoll) : diceFace}
                    diceRolling={online ? onlineDiceRolling : diceRolling}
                    lastRoll={state.lastRoll}
                    pendingRoll={state.pendingRoll}
                    onRoll={online ? handleOnlineRoll : handleRoll}
                    canRoll={online ? canRollOnline : canRollBoard}
                    currentPlayerName={state.currentPlayerName || "-"}
                    currentPlayerLabel={online ? (onlineGameState?.currentPlayerName || "-") : (state.currentPlayerName || "-")}
                    roomPlaying={online}
                />
            </div>
        );
    };

    return (
        <div className="ludo-shell">
            <TopBar onHome={() => (window.location.href = "/home")} />

            <main className="ludo-main ludo-main-local">
                <div className="mode-switch floating">
                    <button className={`pill ${mode === "online" ? "active" : ""}`} onClick={() => { setMode("online"); setView("lobby"); }}>Online</button>
                    <button className={`pill ${mode === "local" ? "active" : ""}`} onClick={() => { setMode("local"); setView("lobby"); }}>Local</button>
                </div>

                {mode === "online" && view === "lobby" ? renderOnlineLobby() : null}
                {mode === "local" && view === "lobby" ? renderLocalSetup() : null}

                {mode === "local" && view === "play" ? (
                    <section className="play-column slide-up">
                        <div className="local-toolbar card">
                            <button type="button" className="btn btn-secondary" onClick={resetAll}>
                                Restart
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => setView("lobby")}>
                                Back to lobby
                            </button>
                            <span className="muted local-toolbar-hint">Pass-and-play</span>
                        </div>

                        <GameHeader
                            title={gameState.title || "Ludo"}
                            turnNumber={gameState.turnNumber || 1}
                            currentPlayerName={gameState.currentPlayerName || "-"}
                            statusText={statusText}
                            errorText={errorText}
                            winner={gameState.winner}
                            localPlay
                        />

                        {renderBoard(gameState, false)}

                        {phase === "finished" && gameState.winner ? (
                            <div className="results-overlay" role="dialog" aria-label="Game results">
                                <div className="results-card card">
                                    <h2 className="results-title">Game over</h2>
                                    <p className="results-winner">
                                        Winner: <strong>{gameState.winner.name}</strong> ({gameState.winner.id})
                                    </p>
                                    <h3 className="results-sub">Final standings</h3>
                                    <ol className="results-list">
                                        {standings.map((p) => (
                                            <li key={p.id}>
                                                <span>{p.name}</span>
                                                <span className="muted">({p.id})</span>
                                                <strong>{p.finishedTokens}/{p.totalTokens} home</strong>
                                            </li>
                                        ))}
                                    </ol>
                                    <button type="button" className="btn btn-roll" onClick={resetAll}>
                                        Play again
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </section>
                ) : null}

                {mode === "online" && view === "play" ? (
                    <section className="play-column slide-up">
                        <div className="local-toolbar card">
                            <button type="button" className="btn btn-secondary" onClick={() => { setView("lobby"); leaveRoom(); }}>
                                Exit room
                            </button>
                            <span className="muted local-toolbar-hint">Room {roomState?.roomId || "-"}</span>
                            {isHost ? <span className="badge">Host</span> : mySeat ? <span className="badge muted">Player</span> : <span className="badge muted">Viewer</span>}
                        </div>
                        <GameHeader
                            title={onlineGameState?.title || `Room ${roomState?.roomId || "Room"}`}
                            turnNumber={onlineGameState?.turnNumber || 1}
                            currentPlayerName={onlineGameState?.currentPlayerName || "-"}
                            statusText={roomState?.lastAction?.message || roomMessage}
                            errorText={socketError}
                            winner={onlineGameState?.winner}
                            localPlay={false}
                        />
                        {renderBoard(onlineGameState, true)}
                    </section>
                ) : null}
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

