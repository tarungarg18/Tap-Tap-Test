# 🚀 Prototype Build — TaPTaP Game Engine
#### Overview

This prototype demonstrates a JSON-driven modular game engine capable of running multiple games using a shared execution core. The engine separates game logic, engine systems, and configuration data, ensuring scalability and reusability.



# 🧠 Core Idea

The engine does not contain any game-specific logic.
#### Instead:

- The engine handles execution (loop, input, update).
- The game module defines behavior.
- The JSON file defines configuration and level data.

# ⚙️ Architecture
```
JSON Config → Game Module → Engine → Output
```
# 🔁 Execution Flow
### 1. User Runs
```
node runner.js game/<game>/levelX.json
```
### 2. Engine
- Loads JSON configuration
- Detects game type
- Initializes game module
- Starts engine loop

### 3. Input System
- Captures user input
- Sends raw input to game

### 4. Game Module
- Processes input
- Updates state
- Renders output

# 🎮 Supported Games
### 1. Tap Game
- Input-based scoring system
#### Configurable:
- Score increment
- Target score
- Input key
### 2. Sudoku Game
- Grid-based puzzle
#### Configurable:
- Board layout
- Solution
- Difficulty levels

# FLow

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
