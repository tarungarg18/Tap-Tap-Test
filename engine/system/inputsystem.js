const readline = require("readline");

class InputSystem {

    constructor(scoreSystem,config) {
        this.scoreSystem = scoreSystem;
        this.scoreKey = config.controls.scoreKey;
        readline.emitKeypressEvents(process.stdin);

        process.stdin.setRawMode(true);
        process.stdin.on("keypress", (str, key) => {

            if (key.name === this.scoreKey) {
                this.scoreSystem.addScore();
            }
            if (key.ctrl && key.name === "c") {
                process.exit();
            }
        });
    }

    update(){};

}

module.exports = InputSystem;
