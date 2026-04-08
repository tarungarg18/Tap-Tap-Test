(function registerLudoBoard(globalScope) {
    const { useMemo } = React;
    const ns = globalScope.TapTapLudoComponents = globalScope.TapTapLudoComponents || {};

    const SIZE = 15;
    const COLOR_ORDER = ["red", "green", "yellow", "blue"];
    const COLOR_HEX = {
        red: "#e43d3d",
        green: "#1fa857",
        yellow: "#f0c213",
        blue: "#2ea1e6"
    };

    const TRACK_PATH = [
        [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
        [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8],
        [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
        [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14],
        [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
        [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6],
        [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
        [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]
    ];

    const HOME_PATHS = {
        red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
        green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
        yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
        blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
    };

    const YARD_SLOTS = {
        red: [[2, 2], [2, 4], [4, 2], [4, 4]],
        green: [[2, 10], [2, 12], [4, 10], [4, 12]],
        yellow: [[10, 10], [10, 12], [12, 10], [12, 12]],
        blue: [[10, 2], [10, 4], [12, 2], [12, 4]]
    };

    function paintRect(grid, startRow, startCol, rowCount, colCount, cell) {
        for (let r = startRow; r < startRow + rowCount; r += 1) {
            for (let c = startCol; c < startCol + colCount; c += 1) {
                grid[r][c] = { ...cell };
            }
        }
    }

    function detectColorKey(player, index) {
        const id = String(player?.id || "").toLowerCase();
        const name = String(player?.name || "").toLowerCase();

        for (const color of COLOR_ORDER) {
            if (id.includes(color) || name.includes(color)) {
                return color;
            }
        }

        return COLOR_ORDER[index % COLOR_ORDER.length];
    }

    function buildGrid(safeCells, startCells) {
        const grid = Array.from({ length: SIZE }, () =>
            Array.from({ length: SIZE }, () => ({ kind: "void" }))
        );

        paintRect(grid, 0, 0, 6, 6, { kind: "base", color: "red" });
        paintRect(grid, 0, 9, 6, 6, { kind: "base", color: "green" });
        paintRect(grid, 9, 9, 6, 6, { kind: "base", color: "yellow" });
        paintRect(grid, 9, 0, 6, 6, { kind: "base", color: "blue" });

        paintRect(grid, 1, 1, 4, 4, { kind: "yard", color: "red" });
        paintRect(grid, 1, 10, 4, 4, { kind: "yard", color: "green" });
        paintRect(grid, 10, 10, 4, 4, { kind: "yard", color: "yellow" });
        paintRect(grid, 10, 1, 4, 4, { kind: "yard", color: "blue" });

        paintRect(grid, 6, 0, 3, 15, { kind: "walkway" });
        paintRect(grid, 0, 6, 15, 3, { kind: "walkway" });

        TRACK_PATH.forEach(([row, col], index) => {
            const cellNumber = index + 1;
            grid[row][col] = {
                kind: "track",
                cellNumber,
                safe: safeCells.has(cellNumber),
                startFor: startCells[cellNumber] || ""
            };
        });

        Object.entries(HOME_PATHS).forEach(([color, path]) => {
            path.forEach(([row, col], idx) => {
                grid[row][col] = {
                    kind: "home",
                    color,
                    step: idx + 1
                };
            });
        });

        grid[7][7] = { kind: "center" };

        return grid;
    }

    function pushToCell(map, row, col, tokenData) {
        const key = `${row}-${col}`;
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(tokenData);
    }

    function resolveCoordinate({
        progress,
        tokenNumber,
        colorKey,
        startIndex,
        trackLength,
        homeLength
    }) {
        const finish = trackLength + homeLength - 1;
        const startZeroBased = Math.max(0, (Number(startIndex) || 1) - 1);

        if (progress < 0) {
            const yardSlots = YARD_SLOTS[colorKey] || [];
            return yardSlots[(tokenNumber - 1) % Math.max(1, yardSlots.length)] || [7, 7];
        }

        if (progress >= finish) {
            return [7, 7];
        }

        if (progress < trackLength) {
            const boardIndex = (startZeroBased + progress) % trackLength;
            return TRACK_PATH[boardIndex];
        }

        const homeStepIndex = progress - trackLength;
        const homePath = HOME_PATHS[colorKey] || [];
        return homePath[Math.max(0, Math.min(homePath.length - 1, homeStepIndex))] || [7, 7];
    }

    ns.LudoBoard = function LudoBoard({
        gameState,
        movableTokens,
        ended,
        onTokenClick,
        myColorKey,
        animationOverrides,
        diceFace,
        diceRolling,
        lastRoll,
        pendingRoll,
        onRoll,
        canRoll,
        currentPlayerName,
        roomPlaying
    }) {
        const players = Array.isArray(gameState?.players) ? gameState.players : [];
        const currentPlayerId = gameState?.currentPlayerId || "";
        const currentColorKey = String(currentPlayerId || "").toLowerCase();
        const trackLength = Number(gameState?.trackLength) || TRACK_PATH.length;
        const homeLength = Number(gameState?.homeLength) || 6;

        const displayDiceValue =
            diceRolling && diceFace != null ? diceFace : pendingRoll != null ? pendingRoll : lastRoll;

        const { boardGrid, tokenMap } = useMemo(() => {
            const safeCells = new Set((gameState?.safeCells || []).map((value) => Number(value)));
            const startCells = {};

            players.forEach((player, index) => {
                const colorKey = detectColorKey(player, index);
                const start = Number(player?.startIndex);
                if (Number.isInteger(start) && start >= 1 && start <= TRACK_PATH.length) {
                    startCells[start] = colorKey;
                }
            });

            const grid = buildGrid(safeCells, startCells);
            const placement = new Map();
            const overrides = animationOverrides || {};

            players.forEach((player, playerIndex) => {
                const colorKey = detectColorKey(player, playerIndex);
                const baseColor = player?.color || COLOR_HEX[colorKey] || "#54658a";
                const isCurrent = player?.id === currentPlayerId;
                const isMine = player?.id === myColorKey;
                const tokens = Array.isArray(player?.tokens) ? player.tokens : [];

                tokens.forEach((token, tokenIndex) => {
                    const tokenNumber = Number(token?.tokenNumber) || tokenIndex + 1;
                    const key = `${player.id || colorKey}-${tokenNumber}`;
                    const status = String(token?.status || "").toUpperCase();
                    const movable = isCurrent && isMine && movableTokens.includes(tokenNumber) && !ended;

                    const progress = Object.prototype.hasOwnProperty.call(overrides, key)
                        ? Number(overrides[key])
                        : Number(token?.progress);

                    const [row, col] = resolveCoordinate({
                        progress: Number.isFinite(progress) ? progress : -1,
                        tokenNumber,
                        colorKey,
                        startIndex: player?.startIndex,
                        trackLength,
                        homeLength
                    });

                    const payload = {
                        key,
                        playerName: player?.name || "Player",
                        tokenNumber,
                        status,
                        colorKey,
                        baseColor,
                        movable
                    };

                    pushToCell(placement, row, col, payload);
                });
            });

            return {
                boardGrid: grid,
                tokenMap: placement
            };
        }, [animationOverrides, ended, gameState?.safeCells, trackLength, homeLength, currentPlayerId, movableTokens, players, myColorKey]);

        const DiceFaceComp = globalScope.TapTapLudoComponents?.DiceFace;
        const showCornerHud =
            Boolean(currentColorKey) &&
            COLOR_ORDER.includes(currentColorKey) &&
            !ended;

        return (
            <section className="card board-card">
                <h2 className="panel-title sr-only">Board</h2>

                <div className="ludo-board-wrap">
                    <div className="ludo-board-stage">
                        <div className="ludo-board" role="grid" aria-label="Ludo board">
                            {boardGrid.flatMap((row, rowIndex) =>
                                row.map((cell, colIndex) => {
                                    const key = `${rowIndex}-${colIndex}`;
                                    const tokens = tokenMap.get(key) || [];

                                    let cellClass = "cell";
                                    if (cell.kind === "base") {
                                        cellClass += ` cell-base cell-${cell.color}`;
                                    } else if (cell.kind === "yard") {
                                        cellClass += ` cell-yard cell-${cell.color}`;
                                    } else if (cell.kind === "walkway") {
                                        cellClass += " cell-walkway";
                                    } else if (cell.kind === "track") {
                                        cellClass += " cell-track";
                                        if (cell.safe) cellClass += " safe";
                                        if (cell.startFor) cellClass += ` start-${cell.startFor}`;
                                    } else if (cell.kind === "home") {
                                        cellClass += ` cell-home lane-${cell.color}`;
                                    } else if (cell.kind === "center") {
                                        cellClass += " cell-center";
                                    } else {
                                        cellClass += " cell-void";
                                    }

                                    return (
                                        <div className={cellClass} key={key} role="gridcell">
                                            {cell.kind === "track" && cell.safe ? (
                                                <span className="safe-mark" title="Safe">
                                                    ★
                                                </span>
                                            ) : null}

                                            {cell.kind === "center" ? (
                                                <div className="center-pinwheel" aria-hidden="true"></div>
                                            ) : null}

                                            {tokens.length > 0 ? (
                                                <div className="piece-stack">
                                                    {tokens.map((token) => (
                                                        <button
                                                            key={token.key}
                                                            type="button"
                                                            className={`piece piece-${token.colorKey} ${token.movable ? "movable" : ""}`}
                                                            style={{ "--piece-color": token.baseColor }}
                                                            onClick={() => token.movable && onTokenClick(token.tokenNumber)}
                                                            disabled={!token.movable}
                                                            aria-label={`${token.playerName} pawn ${token.tokenNumber}`}
                                                        >
                                                            <span>{token.tokenNumber}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {showCornerHud ? (
                            <React.Fragment>
                                <div
                                    className={`board-corner-hud corner-${currentColorKey}`}
                                    role="presentation"
                                    aria-hidden="true"
                                >
                                    <div className="corner-hud-outline" />
                                </div>
                                <div
                                    className={`board-turn-docks corner-${currentColorKey}`}
                                    role="region"
                                    aria-label={`${currentPlayerName || "Active player"} — dice and roll`}
                                >
                                    <div className="turn-dock-dice">
                                        {DiceFaceComp ? (
                                            <DiceFaceComp
                                                value={displayDiceValue}
                                                rolling={Boolean(diceRolling)}
                                                size="sm"
                                            />
                                        ) : (
                                            <div className="dice-box dice-box-sm dice-fallback" aria-hidden="true">
                                                {displayDiceValue ? (
                                                    <span className="dice-fallback-num">{displayDiceValue}</span>
                                                ) : null}
                                            </div>
                                        )}
                                        {!displayDiceValue && !diceRolling ? (
                                            <span className="turn-dock-hint muted">Roll</span>
                                        ) : null}
                                    </div>
                                    <div className="turn-dock-roll">
                                        <button
                                            type="button"
                                            className="btn btn-roll btn-roll-board"
                                            onClick={onRoll}
                                            disabled={!canRoll}
                                        >
                                            {diceRolling ? "…" : "Roll"}
                                        </button>
                                    </div>
                                </div>
                            </React.Fragment>
                        ) : null}
                    </div>
                </div>
            </section>
        );
    };
})(window);

