# TaPTaP Game Engine

JSON-driven modular game engine.

## Features

- JSON based configuration
- Modular system architecture
- Reusable game systems
- Lightweight and extensible

## Architecture

docs/architecture.md

## Engine Loop

docs/engine-loop.md

## JSON Configuration

config/game-config.sample.json

## Example Game

examples/sampleGame.js
```
taptap-game-engine/
│
├── docs/
│   ├── architecture.md
│   ├── engine-loop.md
│   └── reusability-model.md
│
├── config/
│   └── game-config.sample.json
│
├── engine/
│   ├── core/
│   │   ├── engine.js
│   │   ├── gameLoop.js
│   │   └── eventSystem.js
│   │
│   ├── systems/
│   │   ├── inputSystem.js
│   │   ├── physicsSystem.js
│   │   ├── renderSystem.js
│   │   └── scoreSystem.js
│   │
│   ├── entities/
│   │   ├── player.js
│   │   └── obstacle.js
│   │
│   └── utils/
│       └── configLoader.js
│
├── examples/
│   └── sampleGame.js
│
├── README.md
├── package.json
└── .gitignore
```


Content:

```markdown
# Core Engine Loop

The TaPTaP engine follows a standard game loop pattern.

Game Loop Stages:

1. Input Handling
2. Game State Update
3. Physics Processing
4. Rendering

Pseudo Code:

while (gameRunning) {

   handleInput()

   updateGameState()

   applyPhysics()

   renderFrame()

}
# Reusability Model

TaPTaP engine is designed for reuse through JSON configuration.

Developers do not need to modify engine code.

They only change:

- Entities
- Physics rules
- Game parameters
- Input mapping

Example:

Different games possible:

1. Flappy Bird
2. Runner Game
3. Tap Dodger
4. Jump Platformer

All using same engine.

Game behaviour defined in JSON config.
{
  "game": {
    "title": "Tap Dodger",
    "fps": 60
  },

  "player": {
    "speed": 5,
    "jumpForce": 12,
    "gravity": 0.5
  },

  "obstacles": {
    "spawnRate": 2,
    "speed": 4
  },

  "controls": {
    "tap": "jump"
  },

  "score": {
    "increment": 10
  }
}

function startGameLoop(update, render) {
  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  loop();
}

module.exports = startGameLoop;

