class LudoGame {
    constructor(config) {
        if (!config || typeof config !== "object") {
            throw new Error("LudoGame requires config");
        }

        this.config = config;
        this.rules = this.config.rules || {};
        this.messages = this.normalizeMessages(this.config.messages);
        this.inputConfig = this.normalizeInput(this.config.input);
        this.gameplay = this.normalizeGameplay(this.config.gameplay);

        this.players = this.gameplay.players.map((player) => ({
            ...player,
            tokens: Array.from({ length: this.gameplay.tokensPerPlayer }, () => -1)
        }));

        this.currentPlayerIndex = 0;
        this.turnNumber = 1;
        this.pendingRoll = null;
        this.lastRoll = null;
        this.movableTokens = [];
        this.gameOver = false;
        this.winner = null;
    }

    init() {
        if (typeof window === "undefined") {
            console.log(` ${this.config?.game?.title || "Ludo"}`);
        }
    }

    handleInput(input) {
        try {
            if (this.gameOver) {
                return this.invalid("Game already ended");
            }

            if (typeof input !== "string") {
                return this.invalid(this.messages.invalid);
            }

            const normalized = input.trim().toLowerCase();
            if (!normalized) {
                return this.invalid(this.messages.invalid);
            }

            if (normalized === this.inputConfig.roll) {
                return this.handleRoll();
            }

            const movePrefix = `${this.inputConfig.move} `;
            if (normalized.startsWith(movePrefix)) {
                return this.handleMove(normalized.slice(movePrefix.length).trim());
            }

            if (this.pendingRoll !== null) {
                return this.handleMove(normalized);
            }

            return this.invalid(this.messages.invalid);
        } catch {
            return {
                type: "ERROR",
                message: this.messages.error
            };
        }
    }

    handleRoll() {
        if (this.pendingRoll !== null) {
            return this.invalid(this.messages.alreadyRolled);
        }

        const activePlayer = this.currentPlayer();
        const roll = this.rollDice();

        this.pendingRoll = roll;
        this.lastRoll = roll;
        this.movableTokens = this.getMovableTokenIndexes(this.currentPlayerIndex, roll);

        if (this.movableTokens.length === 0) {
            this.pendingRoll = null;
            this.movableTokens = [];

            let message = `${activePlayer.name} rolled ${roll}. ${this.messages.noMove}`;
            const bonusRoll = this.gameplay.extraTurnOnSix && roll === this.gameplay.entryRoll;

            if (bonusRoll) {
                message = `${message} ${this.messages.extraTurn}`;
            } else {
                this.advanceTurn();
            }

            return {
                type: "ROLL",
                message
            };
        }

        const options = this.movableTokens.map((index) => `${this.inputConfig.tokenPrefix}${index + 1}`).join(", ");
        return {
            type: "ROLL",
            message: `${activePlayer.name} rolled ${roll}. Move one token: ${options}.`
        };
    }

    handleMove(tokenText) {
        if (this.pendingRoll === null) {
            return this.invalid(this.messages.rollFirst);
        }

        const tokenIndex = this.parseTokenIndex(tokenText);
        if (tokenIndex === null) {
            return this.invalid(this.messages.invalidToken);
        }

        if (!this.movableTokens.includes(tokenIndex)) {
            return this.invalid(this.messages.invalidMoveForRoll);
        }

        const roll = this.pendingRoll;
        const playerIndex = this.currentPlayerIndex;
        const player = this.players[playerIndex];
        const fromProgress = player.tokens[tokenIndex];
        const move = this.applyMove(playerIndex, tokenIndex, roll);

        this.pendingRoll = null;
        this.movableTokens = [];

        if (!move.ok) {
            return this.invalid(this.messages.invalidMoveForRoll);
        }

        const movement = {
            playerId: player.id,
            tokenNumber: tokenIndex + 1,
            fromProgress,
            toProgress: move.toProgress,
            roll
        };

        const won = this.playerFinished(playerIndex);
        if (won) {
            this.gameOver = true;
            this.winner = {
                id: player.id,
                name: player.name,
                color: player.color
            };

            return {
                type: "WIN",
                message: `${player.name} ${this.messages.win}`,
                scoreDelta: this.ruleValue("MOVE") + (move.reachedHome ? this.ruleValue("HOME") : 0),
                movement
            };
        }

        const bonusRollFromSix = this.gameplay.extraTurnOnSix && roll === this.gameplay.entryRoll;
        const bonusRollFromCapture = this.gameplay.extraTurnOnCapture && move.capturedCount > 0;
        const bonusRoll = bonusRollFromSix || bonusRollFromCapture;

        let message = `${player.name} moved ${this.inputConfig.tokenPrefix}${tokenIndex + 1} by ${roll}.`;

        if (move.capturedCount > 0) {
            message = `${message} ${this.messages.captured}`;
        } else if (move.reachedHome) {
            message = `${message} ${this.messages.home}`;
        } else {
            message = `${message} ${this.messages.moved}`;
        }

        if (bonusRoll) {
            message = `${message} ${this.messages.extraTurn}`;
        } else {
            this.advanceTurn();
        }

        if (move.capturedCount > 0) {
            return {
                type: "CAPTURE",
                message,
                scoreDelta:
                    this.ruleValue("MOVE") +
                    (move.reachedHome ? this.ruleValue("HOME") : 0) +
                    this.ruleValue("CAPTURE") * Math.max(0, move.capturedCount - 1),
                movement
            };
        }

        if (move.reachedHome) {
            return {
                type: "HOME",
                message,
                scoreDelta: this.ruleValue("MOVE"),
                movement
            };
        }

        return {
            type: "MOVE",
            message,
            movement
        };
    }

    update() {}

    expireTurn() {
        if (this.gameOver) {
            return this.invalid("Game already ended");
        }

        const activePlayer = this.currentPlayer();
        if (!activePlayer) {
            return this.invalid("No active player");
        }

        this.pendingRoll = null;
        this.movableTokens = [];
        this.advanceTurn();

        return {
            type: "TURN_TIMEOUT",
            message: `${activePlayer.name} turn timed out. Next player turn.`
        };
    }

    render() {
        return this.getState();
    }

    getState() {
        const activePlayer = this.currentPlayer();

        return {
            title: this.config?.game?.title || "Ludo",
            trackLength: this.gameplay.trackLength,
            homeLength: this.gameplay.homeLength,
            tokensPerPlayer: this.gameplay.tokensPerPlayer,
            safeCells: this.gameplay.safeCells.map((cell) => cell + 1),
            dice: { ...this.gameplay.dice },
            turnNumber: this.turnNumber,
            currentPlayerId: activePlayer?.id || "",
            currentPlayerName: activePlayer?.name || "",
            currentPlayerColor: activePlayer?.color || "",
            pendingRoll: this.pendingRoll,
            lastRoll: this.lastRoll,
            movableTokens: this.movableTokens.map((index) => index + 1),
            occupiedTrackCells: this.buildOccupiedTrackCells(),
            winner: this.winner ? { ...this.winner } : null,
            gameOver: this.gameOver,
            players: this.players.map((player, playerIndex) => ({
                id: player.id,
                name: player.name,
                color: player.color,
                startIndex: player.startIndex + 1,
                finishedTokens: this.countFinishedTokens(playerIndex),
                totalTokens: this.gameplay.tokensPerPlayer,
                tokens: player.tokens.map((progress, idx) =>
                    this.describeToken(player, progress, idx + 1)
                )
            }))
        };
    }

    invalid(message) {
        return {
            type: "INVALID",
            message
        };
    }

    ruleValue(ruleType) {
        const value = this.rules?.[ruleType];
        return typeof value === "number" ? value : 0;
    }

    finishProgress() {
        return this.gameplay.trackLength + this.gameplay.homeLength - 1;
    }

    currentPlayer() {
        return this.players[this.currentPlayerIndex] || null;
    }

    progressToBoardIndex(startIndex, progress) {
        const raw = startIndex + progress;
        const modulo = this.gameplay.trackLength;
        return ((raw % modulo) + modulo) % modulo;
    }

    isSafeCell(cellIndex) {
        return this.gameplay.safeCells.includes(cellIndex);
    }

    parseTokenIndex(tokenText) {
        if (typeof tokenText !== "string") return null;

        const value = tokenText.trim().toLowerCase();
        if (!value) return null;

        if (/^\d+$/.test(value)) {
            return Number(value) - 1;
        }

        const knownPrefixes = [
            this.inputConfig.tokenPrefix,
            "token",
            "p",
            "t"
        ];

        for (const prefix of knownPrefixes) {
            if (!prefix) continue;
            if (!value.startsWith(prefix)) continue;

            const rest = value.slice(prefix.length).trim();
            if (/^\d+$/.test(rest)) {
                return Number(rest) - 1;
            }
        }

        return null;
    }

    rollDice() {
        const min = this.gameplay.dice.min;
        const max = this.gameplay.dice.max;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    canMoveToken(progress, roll) {
        const finish = this.finishProgress();

        if (progress === finish) return false;

        if (progress === -1) {
            if (!this.gameplay.requireSixToEnter) return true;
            return roll === this.gameplay.entryRoll;
        }

        return progress + roll <= finish;
    }

    getMovableTokenIndexes(playerIndex, roll) {
        const player = this.players[playerIndex];
        if (!player) return [];

        const movable = [];

        for (let idx = 0; idx < player.tokens.length; idx += 1) {
            if (this.canMoveToken(player.tokens[idx], roll)) {
                movable.push(idx);
            }
        }

        return movable;
    }

    applyMove(playerIndex, tokenIndex, roll) {
        const player = this.players[playerIndex];
        if (!player) return { ok: false, capturedCount: 0, reachedHome: false };

        const currentProgress = player.tokens[tokenIndex];
        let nextProgress = currentProgress;
        const finish = this.finishProgress();

        if (currentProgress === -1) {
            if (this.gameplay.requireSixToEnter && roll !== this.gameplay.entryRoll) {
                return { ok: false, capturedCount: 0, reachedHome: false };
            }
            nextProgress = 0;
        } else {
            nextProgress = currentProgress + roll;
            if (nextProgress > finish) {
                return { ok: false, capturedCount: 0, reachedHome: false };
            }
        }

        player.tokens[tokenIndex] = nextProgress;

        let capturedCount = 0;

        if (nextProgress >= 0 && nextProgress < this.gameplay.trackLength) {
            const landingCell = this.progressToBoardIndex(player.startIndex, nextProgress);

            if (!this.isSafeCell(landingCell)) {
                for (let pIdx = 0; pIdx < this.players.length; pIdx += 1) {
                    if (pIdx === playerIndex) continue;

                    const opponent = this.players[pIdx];
                    for (let tIdx = 0; tIdx < opponent.tokens.length; tIdx += 1) {
                        const opponentProgress = opponent.tokens[tIdx];
                        if (opponentProgress < 0 || opponentProgress >= this.gameplay.trackLength) {
                            continue;
                        }

                        const opponentCell = this.progressToBoardIndex(opponent.startIndex, opponentProgress);
                        if (opponentCell === landingCell) {
                            opponent.tokens[tIdx] = -1;
                            capturedCount += 1;
                        }
                    }
                }
            }
        }

        return {
            ok: true,
            capturedCount,
            reachedHome: nextProgress === finish,
            toProgress: nextProgress
        };
    }

    countFinishedTokens(playerIndex) {
        const player = this.players[playerIndex];
        if (!player) return 0;

        const finish = this.finishProgress();
        return player.tokens.reduce((total, progress) => total + (progress === finish ? 1 : 0), 0);
    }

    playerFinished(playerIndex) {
        return this.countFinishedTokens(playerIndex) === this.gameplay.tokensPerPlayer;
    }

    advanceTurn() {
        if (this.players.length <= 1) return;

        let nextIndex = this.currentPlayerIndex;

        for (let attempts = 0; attempts < this.players.length; attempts += 1) {
            nextIndex = (nextIndex + 1) % this.players.length;

            if (!this.playerFinished(nextIndex)) {
                if (nextIndex <= this.currentPlayerIndex) {
                    this.turnNumber += 1;
                }

                this.currentPlayerIndex = nextIndex;
                return;
            }
        }
    }

    describeToken(player, progress, tokenNumber) {
        const finish = this.finishProgress();
        const homeTravelDistance = Math.max(1, this.gameplay.homeLength - 1);

        if (progress === -1) {
            return {
                tokenNumber,
                progress,
                status: "YARD",
                label: "Yard",
                boardIndex: null,
                homeIndex: null,
                isSafe: true
            };
        }

        if (progress === finish) {
            return {
                tokenNumber,
                progress,
                status: "FINISHED",
                label: "Finished",
                boardIndex: null,
                homeIndex: this.gameplay.homeLength,
                isSafe: true
            };
        }

        if (progress < this.gameplay.trackLength) {
            const boardIndex = this.progressToBoardIndex(player.startIndex, progress);
            const safe = this.isSafeCell(boardIndex);

            return {
                tokenNumber,
                progress,
                status: "TRACK",
                label: safe ? `Track ${boardIndex + 1} (Safe)` : `Track ${boardIndex + 1}`,
                boardIndex: boardIndex + 1,
                homeIndex: null,
                isSafe: safe
            };
        }

        const homeIndex = progress - this.gameplay.trackLength + 1;
        return {
            tokenNumber,
            progress,
            status: "HOME",
            label: `Home ${Math.min(homeIndex, homeTravelDistance)}/${homeTravelDistance}`,
            boardIndex: null,
            homeIndex,
            isSafe: true
        };
    }

    buildOccupiedTrackCells() {
        const occupancy = new Map();

        this.players.forEach((player) => {
            player.tokens.forEach((progress, tokenIndex) => {
                if (progress < 0 || progress >= this.gameplay.trackLength) {
                    return;
                }

                const boardIndex = this.progressToBoardIndex(player.startIndex, progress);
                const cell = boardIndex + 1;

                if (!occupancy.has(cell)) {
                    occupancy.set(cell, []);
                }

                occupancy.get(cell).push(`${player.name} ${this.inputConfig.tokenPrefix}${tokenIndex + 1}`);
            });
        });

        return Array.from(occupancy.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([cell, tokens]) => ({
                cell,
                safe: this.gameplay.safeCells.includes(cell - 1),
                tokens
            }));
    }

    normalizeInput(input) {
        const roll = typeof input?.roll === "string" && input.roll.trim()
            ? input.roll.trim().toLowerCase()
            : "roll";
        const move = typeof input?.move === "string" && input.move.trim()
            ? input.move.trim().toLowerCase()
            : "move";
        const tokenPrefix = typeof input?.tokenPrefix === "string" && input.tokenPrefix.trim()
            ? input.tokenPrefix.trim().toLowerCase()
            : "p";

        return {
            roll,
            move,
            tokenPrefix,
            help: typeof input?.help === "string" ? input.help : "Use roll, then move p1..p4"
        };
    }

    normalizeMessages(messages) {
        return {
            rollFirst: "Roll the dice first.",
            alreadyRolled: "Dice already rolled. Move a token.",
            invalid: "Use 'roll' or 'move p1..p4'.",
            invalidToken: "Choose a valid token number.",
            invalidMoveForRoll: "That token cannot move with the current roll.",
            noMove: "No valid token can move for this roll.",
            moved: "Move accepted.",
            captured: "Capture! Opponent token sent to yard.",
            home: "Token reached home.",
            extraTurn: "Bonus turn granted.",
            win: "wins the match.",
            error: "Game error.",
            ...(messages && typeof messages === "object" ? messages : {})
        };
    }

    normalizeGameplay(gameplay) {
        const trackLength = this.toPositiveInteger(gameplay?.trackLength, 52, 20, 200);
        const homeLength = this.toPositiveInteger(gameplay?.homeLength, 6, 2, 20);
        const tokensPerPlayer = this.toPositiveInteger(gameplay?.tokensPerPlayer, 4, 1, 8);

        const diceMin = this.toPositiveInteger(gameplay?.dice?.min, 1, 1, 20);
        const diceMax = this.toPositiveInteger(gameplay?.dice?.max, 6, diceMin, 30);
        const entryRoll = this.toPositiveInteger(gameplay?.entryRoll, diceMax, diceMin, diceMax);

        const players = this.normalizePlayers(gameplay?.players, trackLength);

        const defaultSafeCells = [0, 8, 13, 21, 26, 34, 39, 47]
            .filter((value) => value >= 0 && value < trackLength);

        const safeCells = Array.isArray(gameplay?.safeCells)
            ? gameplay.safeCells
                .map((value) => Number(value))
                .filter((value) => Number.isInteger(value) && value >= 0 && value < trackLength)
            : defaultSafeCells;

        const uniqueSafeCells = Array.from(new Set(safeCells));

        return {
            trackLength,
            homeLength,
            tokensPerPlayer,
            requireSixToEnter: gameplay?.requireSixToEnter !== false,
            extraTurnOnSix: gameplay?.extraTurnOnSix !== false,
            extraTurnOnCapture: gameplay?.extraTurnOnCapture !== false,
            entryRoll,
            dice: {
                min: diceMin,
                max: diceMax
            },
            safeCells: uniqueSafeCells.length > 0 ? uniqueSafeCells : defaultSafeCells,
            players
        };
    }

    normalizePlayers(rawPlayers, trackLength) {
        const fallback = this.buildDefaultPlayers(trackLength);

        if (!Array.isArray(rawPlayers) || rawPlayers.length < 2) {
            return fallback;
        }

        const cleaned = rawPlayers
            .slice(0, 4)
            .map((player, index) => {
                if (!player || typeof player !== "object") {
                    return null;
                }

                const fallbackPlayer = fallback[index] || fallback[0];
                const name = typeof player.name === "string" && player.name.trim()
                    ? player.name.trim()
                    : fallbackPlayer.name;
                const id = typeof player.id === "string" && player.id.trim()
                    ? player.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-")
                    : `player-${index + 1}`;
                const color = typeof player.color === "string" && player.color.trim()
                    ? player.color.trim()
                    : fallbackPlayer.color;

                const rawStart = Number(player.startIndex);
                if (!Number.isInteger(rawStart)) {
                    return null;
                }

                const startIndex = ((rawStart % trackLength) + trackLength) % trackLength;

                return {
                    id,
                    name,
                    color,
                    startIndex
                };
            })
            .filter(Boolean);

        if (cleaned.length < 2) {
            return fallback;
        }

        const usedStarts = new Set();
        for (const player of cleaned) {
            if (usedStarts.has(player.startIndex)) {
                return fallback.slice(0, cleaned.length);
            }
            usedStarts.add(player.startIndex);
        }

        return cleaned;
    }

    buildDefaultPlayers(trackLength) {
        const defaults = [
            { id: "red", name: "Red", color: "#df4f4f", startIndex: 0 },
            { id: "green", name: "Green", color: "#2f9d5a", startIndex: 13 },
            { id: "yellow", name: "Yellow", color: "#d9ae1a", startIndex: 26 },
            { id: "blue", name: "Blue", color: "#3d78d8", startIndex: 39 }
        ];

        return defaults.map((player) => ({
            ...player,
            startIndex: player.startIndex % trackLength
        }));
    }

    toPositiveInteger(value, fallback, min, max) {
        const parsed = Number(value);
        if (!Number.isInteger(parsed)) return fallback;
        if (parsed < min) return fallback;
        if (parsed > max) return fallback;
        return parsed;
    }

    
    static createLocalFourPlayer(setup) {
        if (!Array.isArray(setup) || setup.length !== 4) {
            throw new Error("Ludo requires exactly 4 players");
        }

        const allowed = new Set(["red", "green", "yellow", "blue"]);
        const seen = new Set();

        const COLOR_HEX = {
            red: "#df4f4f",
            green: "#2f9d5a",
            yellow: "#d9ae1a",
            blue: "#3d78d8"
        };

        const START_INDEX = {
            red: 0,
            green: 13,
            yellow: 26,
            blue: 39
        };

        const players = setup.map((row, index) => {
            const colorKey = String(row?.colorKey || "").toLowerCase();
            if (!allowed.has(colorKey)) {
                throw new Error(`Invalid color for player ${index + 1}`);
            }
            if (seen.has(colorKey)) {
                throw new Error("Each player must pick a different color");
            }
            seen.add(colorKey);

            const name =
                typeof row?.name === "string" && row.name.trim()
                    ? row.name.trim().slice(0, 24)
                    : `Player ${index + 1}`;

            return {
                id: colorKey,
                name,
                color: COLOR_HEX[colorKey],
                startIndex: START_INDEX[colorKey]
            };
        });

        const config = {
            game: { title: "Ludo" },
            rules: { MOVE: 0, HOME: 0, CAPTURE: 0 },
            messages: {},
            input: {},
            gameplay: {
                players,
                trackLength: 52,
                homeLength: 6,
                tokensPerPlayer: 4,
                dice: { min: 1, max: 6 },
                entryRoll: 6,
                requireSixToEnter: true,
                extraTurnOnSix: true,
                extraTurnOnCapture: true
            }
        };

        return new LudoGame(config);
    }
}

if (typeof window !== "undefined") {
    window.LudoGame = LudoGame;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = LudoGame;
}


