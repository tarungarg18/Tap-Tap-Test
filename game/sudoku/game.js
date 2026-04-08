class SudokuGame {
    constructor(config) {
        if (!config || typeof config !== "object") {
            throw new Error("SudokuGame requires config");
        }

        this.config = config;

        this.board = this.config.board.map((row) => [...row]);
        this.solution = this.config.solution.map((row) => [...row]);

        this.size = this.config.gridSize;
        this.inputConfig = this.config.input;
        this.validation = this.config.validation;
        this.messages = this.config.messages;
        this.rules = this.config.rules;

        this.needsRender = true;
        this.gameOver = false;
    }

    init() {
        if (typeof window === "undefined") {
            console.log(` ${this.config.game.title}`);
        }
    }

    handleInput(input) {
        try {
            if (typeof input !== "string") {
                return this.invalid(this.messages.invalidFormat);
            }

            const separator = this.inputConfig.separator;
            const parts = input.split(separator);

            if (parts.length !== this.inputConfig.expectedLength) {
                return this.invalid(this.messages.invalidFormat);
            }

            const [r, c, val] = parts.map(Number);

            if ([r, c, val].some(Number.isNaN)) {
                return this.invalid(this.messages.invalidFormat);
            }

            if (!this.isValidCell(r, c)) {
                return this.invalid(this.messages.invalidCell);
            }

            if (!this.validation.allowOverwrite && this.board[r][c] !== 0) {
                return this.invalid(this.messages.filled);
            }

            if (this.solution[r][c] !== val) {
                return this.invalid(this.messages.wrong);
            }

            this.board[r][c] = val;

            if (this.isSolved()) {
                this.gameOver = true;
                return {
                    type: "WIN",
                    message: this.messages.win,
                    scoreDelta: this.ruleValue("MOVE")
                };
            }

            return {
                type: "MOVE",
                message: this.messages.correct
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
            console.table(this.board);
            console.log(`Enter: ${this.inputConfig.format}`);
        }

        return state;
    }

    getState() {
        return {
            title: this.config.game.title,
            board: this.board.map((row) => [...row]),
            size: this.size,
            inputFormat: this.inputConfig.format,
            separator: this.inputConfig.separator,
            gameOver: this.gameOver
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

    isValidCell(r, c) {
        return (
            Number.isInteger(r) &&
            Number.isInteger(c) &&
            r >= 0 &&
            r < this.size &&
            c >= 0 &&
            c < this.size
        );
    }

    isSolved() {
        return JSON.stringify(this.board) === JSON.stringify(this.solution);
    }
}

if (typeof window !== "undefined") {
    window.SudokuGame = SudokuGame;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = SudokuGame;
}

