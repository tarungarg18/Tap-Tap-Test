class InputSystem {

    constructor(game) {

        this.game = game;
        this.buffer = "";

        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        process.stdin.on("data", (key) => {

            // ENTER pressed
            if (key === "\r") {
                console.log(); // move to next line

                if (this.buffer.length > 0) {
                    this.game.handleInput(this.buffer);
                }

                this.buffer = "";
                process.stdout.write("> ");
                return;
            }

            // BACKSPACE
            if (key === "\u0008" || key === "\u007f") {
                if (this.buffer.length > 0) {
                    this.buffer = this.buffer.slice(0, -1);

                    // erase last char from terminal
                    process.stdout.write("\b \b");
                }
                return;
            }

            // CTRL+C exit
            if (key === "\u0003") {
                process.exit();
            }

            // NORMAL CHARACTER
            this.buffer += key;
            process.stdout.write(key);
        });

        // prompt
        process.stdout.write("> ");
    }

    update() {}

}

module.exports = InputSystem;