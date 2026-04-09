# Tap-Tap Platform

Tap-Tap is a browser-first multi-game platform built with Node.js, Express, MongoDB, and React UMD pages. It combines authentication, dashboards, leaderboards, JSON-driven level configuration, and multiple playable games in a single web app.

This repository currently includes:
- `Tap`
- `Sudoku`
- `2048`
- `Ludo`

It also includes:
- signup and login
- JWT-protected APIs
- per-user dashboard data
- score tracking and leaderboards
- configurable `flexible.json` game setups
- email support with Gmail SMTP
- dedicated `About Us` and `Contact Us` pages
- real-time multiplayer infrastructure for Ludo with Socket.IO

## Highlights

- Multi-page web experience with Home, Login, Signup, Dashboard, About, Contact, and Game Info pages
- Browser-based game loading through `GET /games/:gameName`
- MongoDB-backed users, score entries, game stats, and leaderboard data
- Protected APIs for profile, dashboard, flexible game config, and score submission
- Contact form acknowledgement email flow
- Signup welcome email support
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
- React 18 UMD + Babel in the browser
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

### Usually Needed

- `PORT`

### Needed For Email Features

- `GMAIL`
- `APP_PASSWORD`

Supported mail aliases also exist in the codebase, including:
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_USER`
- `MAIL_USER`
- `GMAIL_USER`
- `GMAIL_EMAIL`
- `GMAIL_APP_PASSWORD`
- `SMTP_PASSWORD`

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

## NPM Scripts

```bash
npm start
npm run start:web
npm run dev
npm run dev:web
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

## Email Features

The project includes two email-related flows:

### Signup welcome email

When mail is configured, new users can receive a welcome email.

### Contact acknowledgement email

The Contact page allows users to submit:
- name
- email
- phone
- message

The backend validates the request and sends an acknowledgement email when Gmail SMTP is configured.

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

## Customization Guide

### Update branding

You will likely want to edit:
- `web/styles.css`
- `web/home-app.jsx`
- `web/about-app.jsx`
- `web/contact-app.jsx`

### Update contact information

Search for the current names and emails in:
- `web/contact-app.jsx`
- `server/services/mail-service.js`

### Update About page content

Edit:
- `web/about-app.jsx`

This page already contains placeholder sections and ad/promo blocks intended for later customization.

### Add new games

A new game usually needs:
- a folder under `game/`
- a `game.js`
- level JSON files
- a frontend entry under `game/<name>/frontend/`
- recognition in backend game discovery logic if needed

## Suggested Production Improvements

If this project is going beyond local development, recommended next steps include:
- add automated tests
- add API request validation library support
- add linting and formatting
- move frontend build to Vite/Next/React build tooling
- add rate limiting for auth and contact endpoints
- add CSRF and security hardening where appropriate
- add structured logging
- add deployment and CI documentation
- separate development and production config

## Troubleshooting

### Server does not start

Check:
- MongoDB is running
- `.env` exists
- `MONGODB_URI` is valid
- `JWT_SECRET` is set

### Emails are not sending

Check:
- `GMAIL` is set
- `APP_PASSWORD` is set
- you are using a Gmail App Password, not the normal Gmail password
- `.env` is in the project root

### Protected API calls fail

Check:
- the user is logged in
- the token is present in storage
- the request is sending the `Authorization` header

## Authors

- Tara Chand
- Vasudev

## License

Current `package.json` license field:

```text
ISC
```

