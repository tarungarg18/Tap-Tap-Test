class Game2048 {
    constructor(config) {
        if (!config || typeof config !== "object") {
            throw new Error("Game2048 requires config");
        }

        this.config = config;

        this.size = this.config.gridSize;
        this.inputConfig = this.config.input;
        this.messages = this.config.messages;
        this.rules = this.config.rules;

        this.targetTile = this.config.winCondition.targetTile;
        this.spawnFourChance = this.config.gameplay.spawnFourChance;
        this.startTiles = this.config.gameplay.startTiles;

        this.hasCustomBoard = this.isValidBoard(this.config.board);
        this.board = this.buildBoard(this.config.board);

        this.needsRender = true;
        this.gameOver = false;
    }

    init() {
        if (!this.hasCustomBoard) {
            for (let i = 0; i < this.startTiles; i++) {
                this.spawnRandomTile();
            }
        }

        if (typeof window === "undefined") {
            console.log(` ${this.config.game.title}`);
        }
    }

    handleInput(input) {
        try {
            if (typeof input !== "string") {
                return {
                    type: "INVALID",
                    message: this.messages.invalid
                };
            }

            const direction = this.parseDirection(input);
            if (!direction) {
                return {
                    type: "INVALID",
                    message: this.messages.invalid
                };
            }

            const { moved, mergeScore } = this.move(direction);

            if (!moved) {
                return {
                    type: "INVALID",
                    message: this.messages.noMove
                };
            }

            this.spawnRandomTile();

            const moveRule = this.ruleValue("MOVE");

            if (this.getMaxTile() >= this.targetTile) {
                this.gameOver = true;
                return {
                    type: "WIN",
                    message: this.messages.win,
                    scoreDelta: mergeScore + moveRule
                };
            }

            if (!this.hasMoves()) {
                this.gameOver = true;
                return {
                    type: "LOSE",
                    message: this.messages.lose,
                    scoreDelta: mergeScore + moveRule
                };
            }

            return {
                type: "MOVE",
                message: this.messages.move,
                scoreDelta: mergeScore
            };
        } catch {
            return {
                type: "ERROR",
                message: this.messages.error
            };
        }
    }

    update() {}

    render() {
        const state = this.getState();

        if (typeof window === "undefined") {
            console.log(` ${this.config.game.title}`);
            console.log(`Target Tile: ${this.targetTile}`);
            console.log(`Controls: ${this.inputConfig.help}\n`);

            for (const row of this.board) {
                const line = row
                    .map((cell) => (cell === 0 ? "." : String(cell)).padStart(5, " "))
                    .join(" ");
                console.log(line);
            }
        }

        return state;
    }

    getState() {
        return {
            title: this.config.game.title,
            board: this.board.map((row) => [...row]),
            size: this.size,
            targetTile: this.targetTile,
            maxTile: this.getMaxTile(),
            gameOver: this.gameOver
        };
    }

    ruleValue(ruleType) {
        const value = this.rules?.[ruleType];
        return typeof value === "number" ? value : 0;
    }

    parseDirection(rawInput) {
        const normalized = rawInput.trim().toLowerCase();
        return this.inputConfig.map[normalized] || null;
    }

    buildBoard(board) {
        if (this.isValidBoard(board)) {
            return board.map((row) =>
                row.map((value) => (Number.isInteger(value) && value > 0 ? value : 0))
            );
        }

        return Array.from({ length: this.size }, () =>
            Array.from({ length: this.size }, () => 0)
        );
    }

    isValidBoard(board) {
        if (!Array.isArray(board) || board.length !== this.size) return false;
        return board.every((row) => Array.isArray(row) && row.length === this.size);
    }

    getEmptyCells() {
        const cells = [];

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c] === 0) {
                    cells.push({ r, c });
                }
            }
        }

        return cells;
    }

    spawnRandomTile() {
        const emptyCells = this.getEmptyCells();
        if (emptyCells.length === 0) return false;

        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const value = Math.random() < this.spawnFourChance ? 4 : 2;

        this.board[randomCell.r][randomCell.c] = value;
        return true;
    }

    move(direction) {
        let moved = false;
        let mergeScore = 0;

        for (let i = 0; i < this.size; i++) {
            const currentLine = this.readLine(direction, i);
            const { nextLine, lineScore, changed } = this.slideAndMerge(currentLine);

            if (changed) moved = true;
            mergeScore += lineScore;

            this.writeLine(direction, i, nextLine);
        }

        return { moved, mergeScore };
    }

    readLine(direction, index) {
        if (direction === "left") {
            return [...this.board[index]];
        }

        if (direction === "right") {
            return [...this.board[index]].reverse();
        }

        if (direction === "up") {
            return this.board.map((row) => row[index]);
        }

        if (direction === "down") {
            return this.board.map((row) => row[index]).reverse();
        }

        return [];
    }

    writeLine(direction, index, line) {
        if (direction === "left") {
            this.board[index] = [...line];
            return;
        }

        if (direction === "right") {
            this.board[index] = [...line].reverse();
            return;
        }

        if (direction === "up") {
            for (let r = 0; r < this.size; r++) {
                this.board[r][index] = line[r];
            }
            return;
        }

        if (direction === "down") {
            const reversed = [...line].reverse();
            for (let r = 0; r < this.size; r++) {
                this.board[r][index] = reversed[r];
            }
        }
    }

    slideAndMerge(line) {
        const compacted = line.filter((value) => value !== 0);
        const merged = [];
        let lineScore = 0;

        for (let i = 0; i < compacted.length; i++) {
            if (i + 1 < compacted.length && compacted[i] === compacted[i + 1]) {
                const mergedValue = compacted[i] * 2;
                merged.push(mergedValue);
                lineScore += mergedValue;
                i++;
            } else {
                merged.push(compacted[i]);
            }
        }

        while (merged.length < this.size) {
            merged.push(0);
        }

        const changed = merged.some((value, idx) => value !== line[idx]);
        return { nextLine: merged, lineScore, changed };
    }

    hasMoves() {
        if (this.getEmptyCells().length > 0) return true;

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const current = this.board[r][c];

                if (r + 1 < this.size && this.board[r + 1][c] === current) return true;
                if (c + 1 < this.size && this.board[r][c + 1] === current) return true;
            }
        }

        return false;
    }

    getMaxTile() {
        let max = 0;
        for (const row of this.board) {
            for (const value of row) {
                if (value > max) max = value;
            }
        }
        return max;
    }
}

if (typeof window !== "undefined") {
    window.Game2048 = Game2048;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = Game2048;
}

