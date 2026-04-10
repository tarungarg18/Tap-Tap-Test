# Tap-Tap Game

This Project is a browser-first multi-game platform built with Node.js, Express, MongoDB, and React UMD pages. It combines authentication, dashboards, leaderboards, JSON-driven level configuration, and multiple playable games in a single web app.

Currently included Games:
- `Tap`
- `Sudoku`
- `2048`
- `Ludo`

## Deployed Link
https://gameshub-4gc7.onrender.com

## Highlights

- Multi-page web experience with Home, Login, Signup, Dashboard, About, Contact, and Game Info pages
- MongoDB-backed users, score entries, game stats, and leaderboard data
- Protected APIs for profile, dashboard, flexible game config, and score submission
- Shared engine utilities for score and timer systems
- JSON-driven level files for each game

## Tech Stack

- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- bcryptjs
- Nodemailer
- Socket.IO
- React
- Plain CSS

## Project Structure

```text
Tap-Tap-Test/
|-- engine/
|   |-- core/
|   |   |-- engine.js
|   |-- system/
|       |-- scoresystem.js
|       |-- timersystem.js
|
|-- game/
|   |-- common/
|   |   |-- frontend/
|   |       |-- api.js
|   |
|   |-- 2048/
|   |   |-- game.js
|   |   |-- level1.json
|   |   |-- level2.json
|   |   |-- level3.json
|   |   |-- level4.json
|   |   |-- flexible.json
|   |   |-- frontend/
|   |
|   |-- Tap/
|   |   |-- game.js
|   |   |-- level1.json
|   |   |-- level2.json
|   |   |-- level3.json
|   |   |-- level4.json
|   |   |-- flexible.json
|   |   |-- frontend/
|   |
|   |-- sudoku/
|   |   |-- game.js
|   |   |-- level1.json
|   |   |-- level2.json
|   |   |-- level3.json
|   |   |-- level4.json
|   |   |-- flexible.json
|   |   |-- frontend/
|   |
|   |-- ludo/
|       |-- game.js
|       |-- level1.json
|       |-- flexible.json
|       |-- frontend/
|
|-- server/
|   |-- app.js
|   |-- index.js
|   |-- db/
|   |   |-- connect.js
|   |-- middleware/
|   |   |-- auth.js
|   |-- models/
|   |   |-- Game.js
|   |   |-- GameStat.js
|   |   |-- Leaderboard.js
|   |   |-- ScoreEntry.js
|   |   |-- User.js
|   |-- realtime/
|   |   |-- ludo-room-service.js
|   |   |-- socket-server.js
|   |-- routes/
|   |   |-- auth-api.js
|   |   |-- dashboard-api.js
|   |   |-- games-api.js
|   |   |-- mail-api.js
|   |-- services/
|   |   |-- auth-service.js
|   |   |-- dashboard-service.js
|   |   |-- game-mode-service.js
|   |   |-- game-service.js
|   |   |-- leaderboard-service.js
|   |   |-- mail-service.js
|   |   |-- user-leaderboard-service.js
|   |-- templates/
|   |   |-- signup-welcome-email.js
|   |-- utils/
|       |-- errors.js
|       |-- json-file.js
|       |-- mail-env.js
|       |-- validators.js
|
|-- web/
|   |-- about.html
|   |-- about-app.jsx
|   |-- contact.html
|   |-- contact-app.jsx
|   |-- dashboard.html
|   |-- dashboard-app.jsx
|   |-- game-info.html
|   |-- game-info-app.jsx
|   |-- home.html
|   |-- home-app.jsx
|   |-- login.html
|   |-- login-app.jsx
|   |-- signup.html
|   |-- signup-app.jsx
|   |-- styles.css
|   |-- public/
|
|-- .env.example
|-- package.json
|-- package-lock.json
|-- README.md
```

## How It Works

### Frontend

The frontend is served directly by Express. Each page uses:
- a static HTML file in `web/`
- a React UMD entry file such as `home-app.jsx`
- the shared browser API helper at `game/common/frontend/api.js`

### Backend

The backend is an Express application that:
- serves static frontend and game assets
- exposes REST APIs under `/api`
- connects to MongoDB
- creates an HTTP server
- attaches Socket.IO for real-time features

The main server entry point is:

```bash
server/index.js
```

## Available Pages

When the app is running locally, the main pages are:

- `/`
- `/home`
- `/home/contact-us`
- `/about`
- `/login`
- `/signup`
- `/dashboard`
- `/game-info/:gameName`
- `/games/:gameName`

## API Overview

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Dashboard

- `GET /api/dashboard/me`
- `GET /api/dashboard/leaderboard?page=1&limit=10`

### Games

- `GET /api/games`
- `GET /api/games/summary`
- `GET /api/games/leaderboards`
- `GET /api/games/:gameName/levels`
- `GET /api/games/:gameName/config/:levelFile`
- `GET /api/games/:gameName/flexible`
- `PUT /api/games/:gameName/flexible`
- `GET /api/games/:gameName/leaderboard`
- `POST /api/games/:gameName/leaderboard`

### Mail

- `GET /api/mail/status`
- `POST /api/mail/test`
- `POST /api/mail/contact`

## Environment Variables

Create a `.env` file in the project root.

Example:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/tap_tap
JWT_SECRET=replace_with_secure_secret
PORT=3000

GMAIL=your.address@gmail.com
APP_PASSWORD=your_16_char_app_password
MAIL_FROM_NAME=Tap Tap
```

### Required

- `MONGODB_URI`
- `JWT_SECRET`
- `PORT`
- `GMAIL`
- `APP_PASSWORD`

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in real values.

### 3. Start MongoDB

Run MongoDB locally or provide a valid hosted MongoDB connection string.

### 4. Start the app

Production-style run:

```bash
npm start
```

Development run with auto-reload:

```bash
npm run dev
```

Current script behavior:
- `start` and `start:web` both run `node server/index.js`
- `dev` and `dev:web` both run `nodemon server/index.js`

## Authentication Flow

- Users can sign up with username, email, and password
- Passwords are hashed with `bcryptjs`
- Login returns a JWT
- Protected endpoints require `Authorization: Bearer <token>`
- The browser stores auth state through the shared frontend API helper

## Game Configuration

Each game can use:
- fixed level JSON files like `level1.json`
- a `flexible.json` file for editable configurations

The Home page supports flexible config editing for authenticated users. This makes it easy to:
- tweak gameplay values
- test level variants
- save changes back to disk through the backend

## Leaderboards and Dashboard

The platform tracks user performance and exposes:
- per-game leaderboard data
- aggregated global leaderboard data
- per-user dashboard stats
- max score summaries
- recent score history

## Real-Time Multiplayer

Ludo includes real-time multiplayer infrastructure through Socket.IO.

Relevant files:
- `server/realtime/socket-server.js`
- `server/realtime/ludo-room-service.js`
- `game/ludo/frontend/`

This area is the foundation for:
- room-based play
- turn management
- multiplayer synchronization
- timeout handling

### Add new games

A new game usually needs:
- a folder under `game/`
- a `game.js`
- level JSON files
- a frontend entry under `game/<name>/frontend/`
- recognition in backend game discovery logic if needed

## Authors

- Tara Chand
- Vasudev

## License

Current `package.json` license field:

```text
ISC
```