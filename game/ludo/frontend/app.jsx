const { useCallback, useRef, useState } = React;

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
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
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
        for (let p = 0; p <= toProgress; p += 1) {
            steps.push(p);
        }
        return steps;
    }

    if (toProgress < fromProgress) {
        return [toProgress];
    }

    const steps = [];
    for (let p = fromProgress + 1; p <= toProgress; p += 1) {
        steps.push(p);
    }
    return steps;
}

function validateSetupRows(rows) {
    const colors = rows.map((r) => r.colorKey);
    if (new Set(colors).size !== 4) {
        throw new Error("Each player must choose a different color.");
    }
}

function App() {
    const { TopBar, GameHeader, LudoBoard } = window.TapTapLudoComponents;

    const gameRef = useRef(null);
    const [actionBusy, setActionBusy] = useState(false);

    const [phase, setPhase] = useState("setup");
    const [setupRows, setSetupRows] = useState([
        { name: "", colorKey: "red" },
        { name: "", colorKey: "green" },
        { name: "", colorKey: "yellow" },
        { name: "", colorKey: "blue" }
    ]);

    const [gameState, setGameState] = useState(defaultGameState());
    const [statusText, setStatusText] = useState("Enter four names, assign colors, then start.");
    const [errorText, setErrorText] = useState("");

    const [diceRolling, setDiceRolling] = useState(false);
    const [diceFace, setDiceFace] = useState(null);
    const [animationOverrides, setAnimationOverrides] = useState({});

    const isPlaying = phase === "play";
    const currentId = gameState.currentPlayerId || "";
    const hasPendingRoll = gameState.pendingRoll !== null && gameState.pendingRoll !== undefined;
    const canRollBoard =
        isPlaying &&
        !gameState.gameOver &&
        !diceRolling &&
        !actionBusy &&
        !hasPendingRoll;

    const resetAll = useCallback(() => {
        gameRef.current = null;
        setActionBusy(false);
        setPhase("setup");
        setGameState(defaultGameState());
        setStatusText("Enter four names, assign colors, then start.");
        setErrorText("");
        setDiceRolling(false);
        setDiceFace(null);
        setAnimationOverrides({});
    }, []);

    function updateSetupRow(index, patch) {
        setSetupRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    }

    function startMatch() {
        try {
            setErrorText("");
            validateSetupRows(setupRows);
            const game = window.LudoGame.createLocalFourPlayer(setupRows);
            game.init();
            gameRef.current = game;
            const initial = game.getState();
            setGameState(initial);
            setPhase("play");
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

    const standings = (Array.isArray(gameState.players) ? gameState.players : []).slice().sort((a, b) => {
        const fa = Number(a.finishedTokens) || 0;
        const fb = Number(b.finishedTokens) || 0;
        return fb - fa;
    });

    return (
        <div className="ludo-shell">
            <TopBar onHome={() => (window.location.href = "/home")} />

            <main className="ludo-main ludo-main-local">
                {phase === "setup" ? (
                    <section className="card setup-card">
                        <h1 className="setup-title">Ludo — 4 players</h1>
                        <p className="setup-lead muted">
                            Pass the device: turn order is Player 1 → 2 → 3 → 4. Each person picks a corner color (must be unique).
                        </p>

                        <div className="setup-grid">
                            {[0, 1, 2, 3].map((index) => (
                                <div key={index} className="setup-row">
                                    <div className="setup-row-label">Player {index + 1}</div>
                                    <input
                                        className="setup-input"
                                        type="text"
                                        placeholder={`Name ${index + 1}`}
                                        value={setupRows[index].name}
                                        onChange={(e) => updateSetupRow(index, { name: e.target.value })}
                                        maxLength={24}
                                    />
                                    <select
                                        className="setup-select"
                                        value={setupRows[index].colorKey}
                                        onChange={(e) => updateSetupRow(index, { colorKey: e.target.value })}
                                    >
                                        {COLOR_OPTIONS.map((opt) => (
                                            <option key={opt.key} value={opt.key}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        {errorText ? <div className="error setup-error">{errorText}</div> : null}

                        <div className="setup-actions">
                            <button type="button" className="btn btn-roll" onClick={startMatch}>
                                Start game
                            </button>
                        </div>
                    </section>
                ) : null}

                {phase === "play" || phase === "finished" ? (
                    <section className="play-column">
                        <div className="local-toolbar card">
                            <button type="button" className="btn btn-secondary" onClick={resetAll}>
                                New game (clears results)
                            </button>
                            <span className="muted local-toolbar-hint">Refreshing the page also clears everything.</span>
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

                        <div className="play-layout">
                            <LudoBoard
                                gameState={gameState}
                                movableTokens={gameState.movableTokens || []}
                                ended={Boolean(gameState.gameOver)}
                                onTokenClick={handleMove}
                                myColorKey={currentId}
                                animationOverrides={animationOverrides}
                                diceFace={diceFace}
                                diceRolling={diceRolling}
                                lastRoll={gameState.lastRoll}
                                pendingRoll={gameState.pendingRoll}
                                onRoll={handleRoll}
                                canRoll={canRollBoard}
                                currentPlayerName={gameState.currentPlayerName || "-"}
                                roomPlaying={isPlaying}
                            />
                        </div>

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
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
