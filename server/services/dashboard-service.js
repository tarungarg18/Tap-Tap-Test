const ScoreEntry = require("../models/ScoreEntry");
const GameStat = require("../models/GameStat");

async function getUserDashboard(userId) {
    const [stats, recentScores] = await Promise.all([
        GameStat.find({ user: userId })
            .sort({ gameName: 1 })
            .lean(),
        ScoreEntry.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean()
    ]);

    return {
        stats: stats.map((item) => ({
            gameName: item.gameName,
            maxScore: item.maxScore,
            updatedAt: item.updatedAt
        })),
        recentScores: recentScores.map((item) => ({
            gameName: item.gameName,
            level: item.level,
            score: item.score,
            reason: item.reason,
            createdAt: item.createdAt
        }))
    };
}

module.exports = {
    getUserDashboard
};
