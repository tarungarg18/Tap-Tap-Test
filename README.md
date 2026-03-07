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

[Architecture Documentation](docs/architecture.md)

## JSON Configuration

[JSON Configuration](config/game-config.sample.json)

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
## Game Engine Blueprint
```
                +----------------------+
                |     Game JSON        |
                | (Game Definition)    |
                +----------+-----------+
                           |
                           v
+------------------------------------------------+
|                GAME ENGINE CORE                |
|------------------------------------------------|
| Game Loader                                    |
| Game Renderer                                  |
| Timer Manager                                  |
| Score Manager                                  |
| Input Handler                                  |
| Plugin Manager                                 |
| State Manager                                  |
+------------+------------------+----------------+
             |                  |
             v                  v

     +---------------+     +-----------------+
     | Game Plugins  |     | Leaderboard API |
     | Sudoku Game   |     | Submit Score    |
     | Word Builder  |     | Fetch Rankings  |
     +---------------+     +-----------------+

```
## UI Layout
```
----------------------------------
| TapTap Game Engine             |
----------------------------------
| Game Selector                  |
| [Sudoku] [Word Builder]        |
----------------------------------
| Timer        | Score           |
----------------------------------
|                                  |
|        GAME BOARD                |
|                                  |
----------------------------------
| Submit Score | Restart Game     |
----------------------------------
| Leaderboard                      |
----------------------------------
``

