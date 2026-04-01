const express = require("express");

const {
    listGames,
    listLevelFiles,
    readLevelConfig,
    readFlexibleConfig,
    saveFlexibleConfig
} = require("../services/game-service");
const { addLeaderboardEntry, getLeaderboard } = require("../services/leaderboard-service");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", (req, res, next) => {
    try {
        const games = listGames();
        res.json({ games });
    } catch (err) {
        next(err);
    }
});

router.get("/:gameName/levels", (req, res, next) => {
    try {
        const { gameName } = req.params;
        const levels = listLevelFiles(gameName);
        res.json({ game: gameName, levels });
    } catch (err) {
        next(err);
    }
});

router.get("/:gameName/config/:levelFile", (req, res, next) => {
    try {
        const { gameName, levelFile } = req.params;
        const config = readLevelConfig(gameName, levelFile);
        res.json(config);
    } catch (err) {
        next(err);
    }
});

router.get("/:gameName/flexible", (req, res, next) => {
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

router.get("/:gameName/leaderboard", async (req, res, next) => {
    try {
        const { gameName } = req.params;
        const leaderboard = await getLeaderboard(gameName);
        res.json({ game: gameName, leaderboard });
    } catch (err) {
        next(err);
    }
});

router.post("/:gameName/leaderboard", requireAuth, async (req, res, next) => {
    try {
        const { gameName } = req.params;
        const leaderboard = await addLeaderboardEntry(gameName, req.body || {}, req.auth.userId);
        res.status(201).json({ success: true, leaderboard });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
