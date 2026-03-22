# Tap-Tap Game Engine Prototype

## Overview

Tap-Tap is a **modular CLI-based game engine** built in Node.js that supports multiple games (e.g., Sudoku, Tap) without modifying core systems.

The engine is fully **config-driven**, meaning:
- Game behavior is controlled via JSON
- No changes required in engine for new games
- Supports scoring, timer, leaderboard, and API integration

---
# Core Idea

- **Separation of Concerns**
- **Config-driven design**
- **Plug-and-play game modules**

---

## Project Structure
```
engine/
├── core/
│ └── engine.js
│
├── system/
│ ├── inputsystem.js
│ ├── scoresystem.js
│ ├── timersystem.js
│ └── leaderboard.js
│
├── utils/
│ ├── configloader.js
│ └── apiclient.js
│
game/
├── sudoku/
│ ├── game.js
│ ├── level1.json
│ ├── level2.json
│ └── ...
│
├── tap/
│ ├── game.js
│ ├── level1.json
│ └── ...

```

---

## Core Components

### 1. GameEngine
- Central controller
- Handles:
  - Game loop
  - Input processing
  - Rendering
  - Game state transitions

---

### 2. Game Modules
Each game implements:

```js
init()
handleInput(input)
update()
render()

### 3. InputSystem

- Captures raw keyboard input
- Sends input to engine
- No UI logic

### 4. ScoreSystem
- Applies score based on:
"rules": {
  "MOVE": 10,
  "INVALID": -5
}
### 5. TimerSystem
- Countdown timer
- Ends game when time reaches 0

### 6. Leaderboard
- Stores scores locally
- Displays ranked players

### 7. APIClient
- Sends score to external API
- Simulates backend integration

# Game Flow
```
Start Engine
   ↓
Load Game + Config
   ↓
Initialize Systems
   ↓
Wait for Input
   ↓
Process Input
   ↓
Update Game State
   ↓
Render Output
   ↓
Repeat
```
# How To Run
```
node runner.js <gameName> <levelFile>
```
eg-
node runner.js sudoku level1.json
node runner.js tap level2.json