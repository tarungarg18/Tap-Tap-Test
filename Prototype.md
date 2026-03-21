🚀 Prototype Build — TaPTaP Game Engine
Overview

This prototype demonstrates a JSON-driven modular game engine capable of running multiple games using a shared execution core. The engine separates game logic, engine systems, and configuration data, ensuring scalability and reusability.

🧠 Core Idea

The engine does not contain any game-specific logic.
Instead:

The engine handles execution (loop, input, update).
The game module defines behavior.
The JSON file defines configuration and level data.




```
node runner.js game/<gameName>/levelX.json
            │
            ▼
     runner.js
            │
            ▼
  Load JSON config (configloader)
            │
            ▼
  Detect game type (tap / sudoku)
            │
            ▼
  Create Game Object
            │
            ▼
  Initialize GameEngine
            │
            ▼
  Attach InputSystem
            │
            ▼
  engine.start()
            │
            ▼
      Game Loop Starts
            │
            ▼
     ┌───────────────┐
     │   LOOP RUNS   │
     └───────────────┘
            │
            ▼
   Wait for user input
            │
            ▼
 InputSystem captures input
            │
            ▼
 game.handleInput(input)
            │
            ▼
 Game updates state
            │
            ▼
 Game.render()
            │
            ▼
 Updated output shown

 ```