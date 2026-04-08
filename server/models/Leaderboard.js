const mongoose = require("mongoose");

const leaderboardSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true
        },
        totalScore: {
            type: Number,
            default: 0
        },
        rank: {
            type: Number,
            default: null
        },
        lastCalculatedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

leaderboardSchema.index({ totalScore: -1 });

module.exports = mongoose.model("Leaderboard", leaderboardSchema);

