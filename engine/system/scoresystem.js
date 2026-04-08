class ScoreSystem {
    constructor(config) {
        this.reset(config);
    }

    reset(config) {
        try {
            this.score = config?.player?.startScore || 0;
            this.rules = config?.rules || {};
        } catch (err) {
            console.error("[ScoreSystem RESET ERROR]", err.message);
            this.score = 0;
            this.rules = {};
        }
    }

    apply(action) {
        try {
            if (!action || !action.type) return;

            const value = this.rules[action.type];

            if (typeof value === "number") {
                this.score += value;
            }

            if (typeof action.scoreDelta === "number") {
                this.score += action.scoreDelta;
            }
        } catch (err) {
            console.error("[ScoreSystem APPLY ERROR]", err.message);
        }
    }

    getScore() {
        return this.score;
    }
}

if (typeof window !== "undefined") {
    window.ScoreSystem = ScoreSystem;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = ScoreSystem;
}

