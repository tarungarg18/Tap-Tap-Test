const GameStat = require("../models/GameStat");
const ScoreEntry = require("../models/ScoreEntry");
const { createHttpError } = require("../utils/errors");
const { isSafeName } = require("../utils/validators");

function normalizeGameName(gameName) {
    return String(gameName || "").toLowerCase();
}

function assertGameName(gameName) {
    if (!isSafeName(gameName)) {
        throw createHttpError(400, "Invalid game name");
    }
}

function normalizeScorePayload(payload) {
    const numericScore = Number(payload?.score);
    const score = Number.isFinite(numericScore) ? Math.floor(numericScore) : 0;

    const reason = typeof payload?.reason === "string" && payload.reason.trim().length > 0
        ? payload.reason.trim().slice(0, 32)
        : "FINISHED";

    const level = typeof payload?.level === "string" && payload.level.trim().length > 0
        ? payload.level.trim().slice(0, 64)
        : "unknown";

    return { score, reason, level };
}

async function getLeaderboard(gameName, limit = 10) {
    assertGameName(gameName);

    const normalized = normalizeGameName(gameName);
    const cap = Math.max(1, Math.min(100, Number(limit) || 10));

    const leaderboard = await GameStat.aggregate([
        { $match: { gameName: normalized } },
        { $sort: { maxScore: -1, updatedAt: 1 } },
        { $limit: cap },
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
                score: "$maxScore",
                updatedAt: 1
            }
        }
    ]);

    return leaderboard.map((item) => ({
        userId: String(item.userId),
        username: item.username,
        score: item.score,
        updatedAt: item.updatedAt
    }));
}

async function addLeaderboardEntry(gameName, payload, userId) {
    assertGameName(gameName);

    if (!userId) {
        throw createHttpError(401, "Unauthorized");
    }

    const normalizedGame = normalizeGameName(gameName);
    const { score, reason, level } = normalizeScorePayload(payload || {});

    await ScoreEntry.create({
        user: userId,
        gameName: normalizedGame,
        level,
        score,
        reason
    });

    await GameStat.findOneAndUpdate(
        { user: userId, gameName: normalizedGame },
        {
            $max: { maxScore: score },
            $set: { gameName: normalizedGame, user: userId }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return getLeaderboard(normalizedGame, 10);
}

module.exports = {
    getLeaderboard,
    addLeaderboardEntry
};
