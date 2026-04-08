const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { getMe } = require("../services/auth-service");
const { getUserDashboard } = require("../services/dashboard-service");
const { getGlobalLeaderboard } = require("../services/user-leaderboard-service");

const router = express.Router();

router.get("/me", requireAuth, async (req, res, next) => {
    try {
        const [user, dashboard] = await Promise.all([
            getMe(req.auth.userId),
            getUserDashboard(req.auth.userId)
        ]);

        res.json({
            user,
            stats: dashboard.stats,
            recentScores: dashboard.recentScores
        });
    } catch (err) {
        next(err);
    }
});

router.get("/leaderboard", requireAuth, async (req, res, next) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const result = await getGlobalLeaderboard({ page, limit });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;

