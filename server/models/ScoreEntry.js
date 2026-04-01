const mongoose = require("mongoose");

const scoreEntrySchema = new mongoose.Schema(
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
            lowercase: true,
            trim: true,
            index: true
        },
        level: {
            type: String,
            required: true,
            trim: true,
            maxlength: 64
        },
        score: {
            type: Number,
            required: true
        },
        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 32
        }
    },
    {
        timestamps: true
    }
);

scoreEntrySchema.index({ gameName: 1, score: -1 });
scoreEntrySchema.index({ user: 1, gameName: 1, createdAt: -1 });

module.exports = mongoose.model("ScoreEntry", scoreEntrySchema);
