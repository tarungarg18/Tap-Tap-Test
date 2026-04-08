(function initEngine(globalScope) {
    const ScoreSystemClass = globalScope.ScoreSystem || (
        typeof module !== "undefined" && module.exports
            ? require("../system/scoresystem")
            : null
    );

    const TimerSystemClass = globalScope.TimerSystem || (
        typeof module !== "undefined" && module.exports
            ? require("../system/timersystem")
            : null
    );

    class GameEngine {
        constructor(config, options = {}) {
            this.config = config || {};

            this.game = null;
            this.running = false;
            this.ended = false;

            this.lastMessage = "";
            this.lastAction = null;
            this.endReason = "";

            this.onRender = typeof options.onRender === "function" ? options.onRender : () => {};
            this.onGameEnd = typeof options.onGameEnd === "function" ? options.onGameEnd : () => {};

            this.scoreSystem = options.scoreSystem || new ScoreSystemClass(this.config);
            this.timerSystem = options.timerSystem || new TimerSystemClass(this.config);

            const fps = Number(this.config?.game?.fps);
            this.fps = Number.isFinite(fps) && fps > 0 ? fps : 30;
            this.frameDurationMs = 1000 / this.fps;

            this.accumulatorMs = 0;
            this.lastFrameTs = 0;
            this.rafId = null;
            this.timeoutId = null;

            this.inputSystem = null;
        }

        setGame(game) {
            if (!game || typeof game !== "object") {
                throw new Error("Invalid game instance");
            }

            const requiredMethods = ["init", "handleInput", "update", "render"];
            for (const method of requiredMethods) {
                if (typeof game[method] !== "function") {
                    throw new Error(`Game missing method: ${method}`);
                }
            }

            this.game = game;
        }

        setScoreSystem(scoreSystem) {
            if (scoreSystem && typeof scoreSystem.apply === "function") {
                this.scoreSystem = scoreSystem;
            }
        }

        setInputSystem(inputSystem) {
            this.inputSystem = inputSystem;
        }

        resetRuntimeState() {
            this.running = false;
            this.ended = false;
            this.lastMessage = "";
            this.lastAction = null;
            this.endReason = "";
            this.accumulatorMs = 0;
            this.lastFrameTs = 0;

            if (typeof this.scoreSystem?.reset === "function") {
                this.scoreSystem.reset(this.config);
            }

            if (typeof this.timerSystem?.reset === "function") {
                this.timerSystem.reset(this.config);
            }
        }

        start() {
            if (!this.game) {
                throw new Error("Game not set");
            }

            this.stopSchedulers();
            this.resetRuntimeState();

            this.running = true;
            this.lastFrameTs = this.now();

            this.safeCall(() => this.game.init());
            this.renderNow();
            this.scheduleNextFrame();
        }

        scheduleNextFrame() {
            if (!this.running) return;

            if (typeof requestAnimationFrame === "function") {
                this.rafId = requestAnimationFrame((ts) => this.loop(ts));
                return;
            }

            this.timeoutId = setTimeout(() => this.loop(this.now()), this.frameDurationMs);
        }

        loop(timestamp) {
            if (!this.running || this.ended) return;

            const currentTs = Number.isFinite(timestamp) ? timestamp : this.now();
            const deltaMs = Math.max(0, currentTs - this.lastFrameTs);
            this.lastFrameTs = currentTs;
            this.accumulatorMs += deltaMs;

            while (this.accumulatorMs >= this.frameDurationMs && this.running && !this.ended) {
                this.timerSystem.update(this.frameDurationMs);
                this.safeCall(() => this.game.update(this.frameDurationMs / 1000));

                if (this.timerSystem.isExpired()) {
                    this.endGame("TIME_UP");
                    break;
                }

                this.accumulatorMs -= this.frameDurationMs;
            }

            this.renderNow();

            if (this.running && !this.ended) {
                this.scheduleNextFrame();
            }
        }

        receiveInput(input) {
            if (!this.running || this.ended || !this.game) return;

            const result = this.safeCall(() => this.game.handleInput(input));
            if (!result || typeof result !== "object") return;

            this.lastAction = result;
            if (result.message) {
                this.lastMessage = result.message;
            }

            if (this.scoreSystem && typeof this.scoreSystem.apply === "function") {
                this.scoreSystem.apply(result);
            }

            if (result.type === "WIN") {
                this.endGame("WIN");
                return;
            }

            if (result.type === "LOSE") {
                this.endGame("LOSE");
                return;
            }

            this.renderNow();
        }

        getSnapshot() {
            const gameState = typeof this.game?.getState === "function"
                ? this.game.getState() || {}
                : {};

            return {
                config: this.config,
                running: this.running,
                ended: this.ended,
                reason: this.endReason,
                message: this.lastMessage,
                action: this.lastAction,
                score: this.safeScore(),
                timeLeft: this.timerSystem.getTime(),
                gameState
            };
        }

        renderNow() {
            const snapshot = this.getSnapshot();

            if (typeof this.game?.render === "function") {
                this.safeCall(() => this.game.render());
            }

            this.onRender(snapshot);
        }

        endGame(reason = "FINISHED") {
            if (this.ended) return;

            this.endReason = reason;
            this.ended = true;
            this.running = false;
            this.stopSchedulers();

            const snapshot = this.getSnapshot();
            this.onRender(snapshot);
            this.onGameEnd(snapshot);
        }

        stopSchedulers() {
            if (this.rafId && typeof cancelAnimationFrame === "function") {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }

            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
        }

        safeScore() {
            try {
                return this.scoreSystem?.getScore?.() ?? 0;
            } catch {
                return 0;
            }
        }

        now() {
            if (typeof performance !== "undefined" && typeof performance.now === "function") {
                return performance.now();
            }
            return Date.now();
        }

        safeCall(fn) {
            try {
                return fn();
            } catch (err) {
                this.handleError("GAME_ERROR", err);
                return null;
            }
        }

        handleError(type, err) {
            if (typeof console !== "undefined" && typeof console.error === "function") {
                console.error(`[Engine ${type}]`, err?.message || err);
            }
        }

        dispose() {
            this.running = false;
            this.ended = true;
            this.stopSchedulers();
            this.inputSystem = null;
            this.game = null;
        }
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = GameEngine;
    }

    globalScope.GameEngine = GameEngine;
})(typeof window !== "undefined" ? window : globalThis);

