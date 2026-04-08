const mongoose = require("mongoose");

const Leaderboard = require("../models/Leaderboard");
const ScoreEntry = require("../models/ScoreEntry");

async function calculateUserTotalScore(userId) {
    const [result] = await ScoreEntry.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: "$user", totalScore: { $sum: "$score" } } }
    ]);

    return result?.totalScore || 0;
}

async function computeRank(totalScore) {
    const betterScores = await Leaderboard.countDocuments({ totalScore: { $gt: totalScore } });
    return betterScores + 1;
}

async function recalcUserLeaderboard(userId) {
    const totalScore = await calculateUserTotalScore(userId);
    const now = new Date();

    const entry = await Leaderboard.findOneAndUpdate(
        { user: userId },
        { $set: { totalScore, lastCalculatedAt: now } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const globalRank = await computeRank(entry.totalScore);

    if (entry.rank !== globalRank) {
        entry.rank = globalRank;
        await entry.save();
    }

    return { totalScore: entry.totalScore, globalRank, rank: globalRank };
}

async function getUserLeaderboard(userId, options = {}) {
    const recalc = options.recalc === true;

    if (recalc) {
        return recalcUserLeaderboard(userId);
    }

    const entry = await Leaderboard.findOne({ user: userId }).lean();

    if (!entry) {
        return recalcUserLeaderboard(userId);
    }

    const globalRank = await computeRank(entry.totalScore);

    if (entry.rank !== globalRank) {
        await Leaderboard.updateOne(
            { user: userId },
            { $set: { rank: globalRank, lastCalculatedAt: new Date() } }
        );
    }

    return { totalScore: entry.totalScore, globalRank, rank: globalRank };
}

module.exports = {
    recalcUserLeaderboard,
    getUserLeaderboard
};
