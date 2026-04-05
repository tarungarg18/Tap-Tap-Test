# Tap-Tap Platform

Tap-Tap is now a browser-first multi-game platform with:
- JWT authentication (signup/login)
- MongoDB user and score storage
- JSON-driven game configs for every level
- Flexible level editing via `flexible.json` per game
- Per-user dashboard with max scores and recent runs

## Tech stack
- Node.js + Express
- MongoDB + Mongoose
- JWT + bcryptjs
- React (UMD + Babel pages)

## Project structure
```text
Tap-Tap/
|-- engine/
|   |-- core/engine.js
|   |-- system/
|       |-- scoresystem.js
|       |-- timersystem.js
|-- server/
|   |-- app.js
|   |-- index.js
|   |-- db/connect.js
|   |-- middleware/auth.js
|   |-- models/
|   |   |-- User.js
|   |   |-- ScoreEntry.js
|   |   |-- GameStat.js
|   |-- routes/
|   |   |-- auth-api.js
|   |   |-- dashboard-api.js
|   |   |-- games-api.js
|   |-- services/
|   |   |-- auth-service.js
|   |   |-- dashboard-service.js
|   |   |-- game-service.js
|   |   |-- leaderboard-service.js
|   |-- utils/
|       |-- errors.js
|       |-- json-file.js
|       |-- validators.js
|-- web/
|   |-- login.html / login-app.jsx
|   |-- signup.html / signup-app.jsx
|   |-- home.html / home-app.jsx
|   |-- dashboard.html / dashboard-app.jsx
|   |-- styles.css
|-- game/
|   |-- common/frontend/api.js
|   |-- 2048/
|   |   |-- game.js
|   |   |-- level1.json ... level4.json
|   |   |-- flexible.json
|   |   |-- frontend/
|   |-- Tap/
|   |   |-- game.js
|   |   |-- level1.json ... level4.json
|   |   |-- flexible.json
|   |   |-- frontend/
|   |-- sudoku/
|   |   |-- game.js
|   |   |-- level1.json ... level4.json
|   |   |-- flexible.json
|   |   |-- frontend/
|   |-- ludo/
|       |-- game.js
|       |-- level1.json ... level4.json
|       |-- flexible.json
|       |-- frontend/
|-- .env.example
|-- package.json
|-- package-lock.json
```

## Setup
1. Start MongoDB locally.
2. Create `.env` from `.env.example`.
3. Install deps:
```bash
npm install
```
4. Start server:
```bash
npm run start
```

## Main URLs
- Login: `http://localhost:3000/login`
- Signup: `http://localhost:3000/signup`
- Home: `http://localhost:3000/home`
- Dashboard: `http://localhost:3000/dashboard`
- Games:
  - `http://localhost:3000/games/2048`
  - `http://localhost:3000/games/Tap`
  - `http://localhost:3000/games/sudoku`
  - `http://localhost:3000/games/ludo`

## Behavior summary
- Username and email are unique.
- Score submission is automatic when a game ends.
- Leaderboard shows top users by max score per game.
- Dashboard shows each user's max score per game and recent score history.
- `flexible.json` can be edited from Home and played instantly for Tap, Sudoku, 2048, and Ludo.
- Ludo now supports real-time 4-player room-based multiplayer over Socket.IO with turn timeout handling.

