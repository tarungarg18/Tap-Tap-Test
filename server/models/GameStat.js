const mongoose = require("mongoose");

const gameStatSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        gameName: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true
        },
        maxScore: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

gameStatSchema.index({ user: 1, gameName: 1 }, { unique: true });
gameStatSchema.index({ gameName: 1, maxScore: -1 });

module.exports = mongoose.model("GameStat", gameStatSchema);
