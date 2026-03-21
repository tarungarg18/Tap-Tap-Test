class TapGame {

    constructor(config) {
        this.score = config.player.startScore || 0;
        this.increment = config.rules.tapIncrement || 1;
        this.target = config.rules.targetScore || 10;
        this.inputKey = config.controls.scoreKey || "tap";
    }

    init() {
        console.log("Tap Game Started");
        console.log(`Target Score: ${this.target}`);
        console.log(`Type "${this.inputKey}" and press Enter`);
        this.render();
    }

    handleInput(input) {

        if (input === this.inputKey) {
            this.score += this.increment;

            if (this.score >= this.target) {
                console.log(`🎉 You Win! Final Score: ${this.score}`);
                process.exit();
            }

            this.render();
        } else {
            console.log(`Type "${this.inputKey}" to score`);
        }
    }

    update() {}

    render() {
        console.log(`Score: ${this.score}`);
    }
}

module.exports = TapGame;