class TapGame {
    constructor(config) {
        this.config = config;

        this.current = 0;

        this.inputConfig = config.input;
        this.messages = config.messages;

        this.score = config.player?.startScore || 0;
        this.rules = config.rules || {};

        this.winCondition = config.winCondition || {};

        this.needsRender = true;
        this.gameOver = false;
    }

    init() {
        console.log(` ${this.config?.game?.title}`);
    }

    handleInput(input) {
        try {
            if (typeof input !== "string") {
                this.applyRule("INVALID");
                return {
                    type: "INVALID",
                    message: this.messages?.invalid
                };
            }

            const expected = this.inputConfig.key;

            if (input !== expected) {
                this.applyRule("INVALID");
                return {
                    type: "INVALID",
                    message: this.messages?.invalid
                };
            }

            this.current++;
            this.applyRule("TAP");

            if (this.checkWin()) {
                this.gameOver = true;
                this.applyRule("WIN");

                return {
                    type: "WIN",
                    message: this.messages?.win
                };
            }

            return {
                type: "TAP",
                message: this.messages?.correct
            };

        } catch (err) {
            this.applyRule("ERROR");
            return {
                type: "ERROR",
                message: "Something went wrong"
            };
        }
    }

    applyRule(type) {
        if (this.rules && this.rules[type] !== undefined) {
            this.score += this.rules[type];
        }
    }

    checkWin() {
        if (!this.winCondition) return false;

        switch (this.winCondition.type) {
            case "TAP_COUNT":
                return this.current >= this.winCondition.value;

            case "SCORE":
                return this.score >= this.winCondition.value;

            default:
                return false;
        }
    }

    update() {}

    render() {
        console.log(`Score: ${this.score}`);
        console.log(`Input: ${this.inputConfig.key}`);
    }
}

module.exports = TapGame;
