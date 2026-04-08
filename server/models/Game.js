const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema(
    {
        
        name: {
            type: String,
            required: true,
            trim: true
        },
        
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        
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

