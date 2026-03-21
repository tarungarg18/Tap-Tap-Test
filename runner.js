const path = require("path");

const GameEngine = require("./engine/core/engine");
const loadConfig = require("./engine/utils/configloader");

// Import games
const SudokuGame = require("./game/sudoku/game");
const TapGame = require("./game/Tap/game");

const configFile = process.argv[2];

if (!configFile) {
    console.log("Please provide config path");
    process.exit();
}

const configPath = path.resolve(configFile);

console.log("Loading config:", configPath);

const config = loadConfig(configPath);

const engine = new GameEngine(config);

let game;

if (config.type === "sudoku") {
    game = new SudokuGame(config);
}
else if (config.type === "tap") {
    game = new TapGame(config);
}
else {
    console.log("Unknown game type:", config.type);
    process.exit();
}

engine.setGame(game);

const InputSystem = require("./engine/system/inputsystem");
new InputSystem(game);

engine.start();