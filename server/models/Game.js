const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema(
    {
        // Human-friendly name (keeps folder casing, e.g., "Tap", "ludo")
        name: {
            type: String,
            required: true,
            trim: true
        },
        // Lowercase key used for lookups/uniqueness.
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        // single | multiplayer
        mode: {
            type: String,
            enum: ["single", "multiplayer"],
            default: "single"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Game", gameSchema);
