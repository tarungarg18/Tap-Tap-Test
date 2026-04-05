const Game = require("../models/Game");
const User = require("../models/User");
const { listGames } = require("./game-service");

const DEFAULT_MODES = {
    ludo: "multiplayer"
};

function toSlug(name) {
    return String(name || "").trim().toLowerCase();
}

function mapGameView(doc) {
    return {
        name: doc.name,
        slug: doc.slug,
        mode: doc.mode
    };
}

async function syncGamesWithFilesystem() {
    const filesystemGames = listGames();
    const activeSlugs = filesystemGames.map((item) => toSlug(item.name));

    if (filesystemGames.length) {
        const bulkOps = filesystemGames.map((item) => {
            const slug = toSlug(item.name);
            const mode = DEFAULT_MODES[slug] || "single";
            return {
                updateOne: {
                    filter: { slug },
                    update: {
                        $set: {
                            name: item.name,
                            slug,
                            mode
                        }
                    },
                    upsert: true
                }
            };
        });

        await Game.bulkWrite(bulkOps, { ordered: false });
    }

    // Return only games that currently exist on disk
    return Game.find({ slug: { $in: activeSlugs } }).sort({ name: 1 }).lean();
}

async function listGamesWithModes() {
    const docs = await syncGamesWithFilesystem();
    return docs.map(mapGameView);
}

async function getGameSummary() {
    const games = await syncGamesWithFilesystem();
    const totalUsers = await User.countDocuments();

    const singlePlayerGames = games.filter((game) => game.mode === "single");
    const multiplayerGames = games.filter((game) => game.mode === "multiplayer");

    return {
        totalGames: games.length,
        singlePlayerCount: singlePlayerGames.length,
        multiplayerCount: multiplayerGames.length,
        totalUsers,
        singlePlayerGames: singlePlayerGames.map(mapGameView),
        multiplayerGames: multiplayerGames.map(mapGameView)
    };
}

module.exports = {
    listGamesWithModes,
    getGameSummary
};
