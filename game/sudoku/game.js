class SudokuGame {

    constructor(config) {
        this.board = config.board;
        this.solution = config.solution;
        this.gridSize = config.gridSize;
    }

    init() {
        console.log("Sudoku Game Started");
        this.render();
    }

    handleInput(input) {

        const parts = input.split(" ");

        if (parts.length !== 3) {
            console.log("Use: row col value");
            return;
        }

        const [r, c, val] = parts.map(Number);

        if (this.solution[r][c] === val) {
            this.board[r][c] = val;
            this.render();
        } else {
            console.log("Wrong value");
        }
    }

    update() {
        if (this.isSolved()) {
            console.log("🎉 Sudoku Solved!");
            process.exit();
        }
    }

    render() {
        console.log("\nBoard:");
        console.table(this.board);
    }

    isSolved() {
        return JSON.stringify(this.board) === JSON.stringify(this.solution);
    }
}

module.exports = SudokuGame;