const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { getMe } = require("../services/auth-service");
const { getUserDashboard } = require("../services/dashboard-service");

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

module.exports = router;
