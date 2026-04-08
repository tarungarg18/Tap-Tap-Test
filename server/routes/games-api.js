
const express = require("express");

const {
    listLevelFiles,
    readLevelConfig,
    readFlexibleConfig,
    saveFlexibleConfig
} = require("../services/game-service");
const { listGamesWithModes, getGameSummary } = require("../services/game-mode-service");
const { addLeaderboardEntry, getLeaderboard, getAllLeaderboards } = require("../services/leaderboard-service");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res, next) => {
    try {
        const games = await listGamesWithModes();
        res.json({ games });
    } catch (err) {
        next(err);
    }
});

router.get("/leaderboards", requireAuth, async (req, res, next) => {
    try {
        const limit = req.query.limit;
        const leaderboards = await getAllLeaderboards(limit);
        res.json({ leaderboards });
    } catch (err) {
        next(err);
    }
});

router.get("/summary", async (req, res, next) => {
    try {
        const summary = await getGameSummary();
        res.json(summary);
    } catch (err) {
        next(err);
    }
});

router.get("/:gameName/levels", requireAuth, (req, res, next) => {
    try {
        const { gameName } = req.params;
        const levels = listLevelFiles(gameName);
        res.json({ game: gameName, levels });
    } catch (err) {
        next(err);
    }
});

router.get("/:gameName/config/:levelFile", requireAuth, (req, res, next) => {
    try {
        const { gameName, levelFile } = req.params;
        const config = readLevelConfig(gameName, levelFile);
        res.json(config);
    } catch (err) {
        next(err);
    }
});

router.get("/:gameName/flexible", requireAuth, (req, res, next) => {
    try {
        const { gameName } = req.params;
        const config = readFlexibleConfig(gameName);
        res.json(config);
    } catch (err) {
        next(err);
    }
});

router.put("/:gameName/flexible", requireAuth, (req, res, next) => {
    try {
        const { gameName } = req.params;
        const saved = saveFlexibleConfig(gameName, req.body || {});
        res.json(saved);
    } catch (err) {
        next(err);
    }
});

router.get("/:gameName/leaderboard", requireAuth, async (req, res, next) => {
    try {
        const { gameName } = req.params;
        const level = req.query.level;
        const leaderboard = await getLeaderboard(gameName, { level });
        res.json({ game: gameName, level: level || null, leaderboard });
    } catch (err) {
        next(err);
    }
});

router.post("/:gameName/leaderboard", requireAuth, async (req, res, next) => {
    try {
        const { gameName } = req.params;
        const result = await addLeaderboardEntry(gameName, req.body || {}, req.auth.userId);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
