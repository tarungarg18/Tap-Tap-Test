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

async function getGlobalLeaderboard(options = {}) {
    const pageRaw = Number(options.page) || 1;
    const limitRaw = Number(options.limit) || 10;
    const page = Math.max(1, pageRaw);
    const limit = Math.max(1, Math.min(50, limitRaw));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
        Leaderboard.aggregate([
            { $sort: { totalScore: -1, updatedAt: 1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    _id: 0,
                    userId: "$user._id",
                    username: "$user.username",
                    totalScore: "$totalScore",
                    rank: "$rank"
                }
            }
        ]),
        Leaderboard.countDocuments()
    ]);

    const entries = items.map((item, index) => ({
        userId: String(item.userId),
        username: item.username,
        score: item.totalScore,
        rank: item.rank != null ? item.rank : skip + index + 1
    }));

    return {
        entries,
        page,
        pageSize: limit,
        total,
        hasNext: skip + items.length < total,
        hasPrev: page > 1
    };
}

module.exports = {
    recalcUserLeaderboard,
    getUserLeaderboard,
    getGlobalLeaderboard
};
