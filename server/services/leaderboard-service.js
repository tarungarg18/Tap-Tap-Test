
const GameStat = require("../models/GameStat");
const ScoreEntry = require("../models/ScoreEntry");
const { listGames } = require("./game-service");
const { createHttpError } = require("../utils/errors");
const { isSafeName, isSafeLevelFile } = require("../utils/validators");
const { recalcUserLeaderboard } = require("./user-leaderboard-service");

function normalizeGameName(gameName) {
    return String(gameName || "").toLowerCase();
}

function assertGameName(gameName) {
    if (!isSafeName(gameName)) {
        throw createHttpError(400, "Invalid game name");
    }
}

function normalizeLevel(level) {
    const raw = String(level || "").trim();
    if (!raw) return "unknown";

    const base = raw.replace(/\.json$/i, "");
    const safe = isSafeLevelFile(raw) || isSafeName(base);
    if (!safe) {
        throw createHttpError(400, "Invalid level name");
    }
    return base.toLowerCase();
}

function normalizeScorePayload(payload) {
    const numericScore = Number(payload?.score);
    const score = Number.isFinite(numericScore) ? Math.floor(numericScore) : 0;

    const reason = typeof payload?.reason === "string" && payload.reason.trim().length > 0
        ? payload.reason.trim().slice(0, 32)
        : "FINISHED";

    const levelRaw = typeof payload?.level === "string" && payload.level.trim().length > 0
        ? payload.level
        : "unknown";

    const level = normalizeLevel(levelRaw);

    return { score, reason, level };
}

async function getLeaderboard(gameName, options = {}) {
    assertGameName(gameName);

    const normalized = normalizeGameName(gameName);
    const cap = Math.max(1, Math.min(100, Number(options.limit) || 10));
    const levelFilter = options.level ? normalizeLevel(options.level) : null;

    const matchStage = { gameName: normalized };
    if (levelFilter) {
        matchStage.level = { $in: [levelFilter, `${levelFilter}.json`] };
    }

    const leaderboard = await ScoreEntry.aggregate([
        { $match: matchStage },
        { $sort: { score: -1, createdAt: 1 } },
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
                score: "$score",
                level: "$level",
                updatedAt: 1,
                createdAt: 1
            }
        }
    ]);

    return leaderboard.map((item) => ({
        userId: String(item.userId),
        username: item.username,
        score: item.score,
        level: item.level,
        updatedAt: item.updatedAt,
        createdAt: item.createdAt
    }));
}

async function getAllLeaderboards(limit = 10) {
    const games = listGames();
    const entries = await Promise.all(
        games.map(async ({ name }) => [name, await getLeaderboard(name, { limit })])
    );
    return Object.fromEntries(entries);
}

async function addLeaderboardEntry(gameName, payload, userId) {
    assertGameName(gameName);

    if (!userId) {
        throw createHttpError(401, "Unauthorized");
    }

    const normalizedGame = normalizeGameName(gameName);
    const { score, reason, level } = normalizeScorePayload(payload || {});

    const match = { user: userId, gameName: normalizedGame, level };
    const existing = await ScoreEntry.findOne(match).lean();

    if (existing && score <= existing.score) {
        const leaderboard = await getLeaderboard(normalizedGame, { level, limit: 20 });
        const globalLeaderboard = await getLeaderboard(normalizedGame, { limit: 20 });
        const userLeaderboard = await recalcUserLeaderboard(userId);
        return { success: true, improved: false, leaderboard, globalLeaderboard, userLeaderboard };
    }

    if (existing) {
        if (score > existing.score) {
            const now = new Date();
            await ScoreEntry.updateOne(match, { $set: { score, reason, createdAt: now, updatedAt: now } });
        }
    } else {
        await ScoreEntry.create({ user: userId, gameName: normalizedGame, level, score, reason });
    }

    const bestGameStat = await GameStat.findOne({ user: userId, gameName: normalizedGame }).lean();
    if (!bestGameStat || score > bestGameStat.maxScore) {
        await GameStat.findOneAndUpdate(
            { user: userId, gameName: normalizedGame },
            { $set: { maxScore: score, gameName: normalizedGame, user: userId } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
    }

    const leaderboard = await getLeaderboard(normalizedGame, { level, limit: 20 });
    const globalLeaderboard = await getLeaderboard(normalizedGame, { limit: 20 });
    const userLeaderboard = await recalcUserLeaderboard(userId);

    return { success: true, improved: true, leaderboard, globalLeaderboard, userLeaderboard };
}

module.exports = {
    getLeaderboard,
    getAllLeaderboards,
    addLeaderboardEntry
};
