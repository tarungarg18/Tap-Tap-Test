class GameEngine {

    constructor(config) {
        this.config = config;
        this.systems = [];
        this.running = false;
    }

    addSystem(system) {
        this.systems.push(system);
    }

    setGame(game) {
        this.game = game;
    }

    start() {
        console.log("Starting Engine...");
        console.log("Game:", this.config.type);
        this.running = true;

        this.game.init();

        const loop = () => {

            if (!this.running) return;

            this.game.update();
            if (this.game.needsRender) {
                this.game.render();
                this.game.needsRender = false;
            }

            setTimeout(loop, 1000 / this.config.game.fps);

        };

        loop();
    }

}

module.exports = GameEngine;
