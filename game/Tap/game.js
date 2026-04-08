class TapGame {
    constructor(config) {
        if (!config || typeof config !== "object") {
            throw new Error("TapGame requires config");
        }

        this.config = config;
        this.inputConfig = this.config.input;
        this.messages = this.config.messages;
        this.rules = this.config.rules;
        this.winCondition = this.config.winCondition;

        if (!this.inputConfig || typeof this.inputConfig.key !== "string") {
            throw new Error("TapGame requires input.key in config");
        }

        this.current = 0;
        this.runtimeScore = Number(this.config.player?.startScore || 0);
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
            if (typeof input !== "string" || input.trim() !== this.inputConfig.key) {
                const invalidDelta = this.ruleValue("INVALID");
                this.runtimeScore += invalidDelta;

                return {
                    type: "INVALID",
                    message: this.messages.invalid
                };
            }

            this.current += 1;
            const tapDelta = this.ruleValue("TAP");
            this.runtimeScore += tapDelta;

            if (this.checkWin()) {
                this.gameOver = true;
                const winDelta = this.ruleValue("WIN");
                this.runtimeScore += winDelta;

                return {
                    type: "WIN",
                    message: this.messages.win,
                    scoreDelta: tapDelta
                };
            }

            return {
                type: "TAP",
                message: this.messages.correct
            };
        } catch {
            const errorDelta = this.ruleValue("ERROR");
            this.runtimeScore += errorDelta;

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
            console.log(`Score: ${this.runtimeScore}`);
            console.log(`Input: ${this.inputConfig.key}`);
        }

        return state;
    }

    getState() {
        return {
            title: this.config.game.title,
            current: this.current,
            score: this.runtimeScore,
            input: this.inputConfig.key,
            winCondition: this.winCondition,
            gameOver: this.gameOver
        };
    }

    checkWin() {
        if (!this.winCondition || !this.winCondition.type) return false;

        if (this.winCondition.type === "TAP_COUNT") {
            return this.current >= this.winCondition.value;
        }

        if (this.winCondition.type === "SCORE") {
            return this.runtimeScore >= this.winCondition.value;
        }

        return false;
    }

    ruleValue(ruleType) {
        const value = this.rules?.[ruleType];
        return typeof value === "number" ? value : 0;
    }
}

if (typeof window !== "undefined") {
    window.TapGame = TapGame;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = TapGame;
}

