const fs = require("fs");
const path = require("path");

const { createHttpError } = require("../utils/errors");
const { isSafeLevelFile, isSafeName } = require("../utils/validators");
const { safeReadJson, safeWriteJson } = require("../utils/json-file");

const ROOT_DIR = path.resolve(__dirname, "../..");
const GAMES_ROOT = path.join(ROOT_DIR, "game");

function ensureGameName(gameName) {
    if (!isSafeName(gameName)) {
        throw createHttpError(400, "Invalid game name");
    }
}

function findGameDirectoryName(gameName) {
    ensureGameName(gameName);

    const entries = fs.readdirSync(GAMES_ROOT, { withFileTypes: true });
    const match = entries.find(
        (entry) => entry.isDirectory() && entry.name.toLowerCase() === String(gameName).toLowerCase()
    );

    if (!match) {
        throw createHttpError(404, "Game not found");
    }

    return match.name;
}

function getGameDir(gameName) {
    const folderName = findGameDirectoryName(gameName);
    return {
        folderName,
        gameDir: path.join(GAMES_ROOT, folderName)
    };
}

function ensureFlexibleConfig(gameName) {
    const { gameDir } = getGameDir(gameName);
    const flexiblePath = path.join(gameDir, "flexible.json");

    if (fs.existsSync(flexiblePath)) {
        return flexiblePath;
    }

    const levelFiles = fs.readdirSync(gameDir)
        .filter((fileName) => isSafeLevelFile(fileName) && fileName.toLowerCase().startsWith("level"));

    levelFiles.sort((a, b) => {
        const aNum = parseInt(a.match(/\d+/)?.[0] || "0", 10);
        const bNum = parseInt(b.match(/\d+/)?.[0] || "0", 10);
        return aNum - bNum;
    });

    const sourcePath = levelFiles.length > 0
        ? path.join(gameDir, levelFiles[0])
        : null;

    const baseConfig = sourcePath
        ? safeReadJson(sourcePath, null)
        : null;

    const flexibleConfig = baseConfig && typeof baseConfig === "object"
        ? { ...baseConfig, level: "flexible.json" }
        : { type: String(gameName).toLowerCase(), level: "flexible.json" };

    safeWriteJson(flexiblePath, flexibleConfig);
    return flexiblePath;
}

function getFrontendIndexPath(gameName) {
    const { gameDir } = getGameDir(gameName);
    const indexFile = path.join(gameDir, "frontend", "index.html");

    if (!fs.existsSync(indexFile)) {
        throw createHttpError(404, "Frontend entry not found for this game");
    }

    return indexFile;
}

function listGames() {
    const entries = fs.readdirSync(GAMES_ROOT, { withFileTypes: true });

    return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
            const gameDir = path.join(GAMES_ROOT, entry.name);
            const hasGameFile = fs.existsSync(path.join(gameDir, "game.js"));
            const hasFrontend = fs.existsSync(path.join(gameDir, "frontend", "index.html"));

            return {
                name: entry.name,
                available: hasGameFile && hasFrontend
            };
        })
        .filter((item) => item.available)
        .map(({ name }) => ({ name }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

function listLevelFiles(gameName) {
    const { gameDir } = getGameDir(gameName);

    ensureFlexibleConfig(gameName);

    const files = fs.readdirSync(gameDir)
        .filter((fileName) => {
            if (!isSafeLevelFile(fileName)) return false;
            if (fileName.toLowerCase() === "flexible.json") return true;
            return fileName.toLowerCase().startsWith("level");
        });

    files.sort((a, b) => {
        if (a.toLowerCase() === "flexible.json") return 1;
        if (b.toLowerCase() === "flexible.json") return -1;

        const aNum = parseInt(a.match(/\d+/)?.[0] || "0", 10);
        const bNum = parseInt(b.match(/\d+/)?.[0] || "0", 10);
        return aNum - bNum;
    });

    return files;
}

function readLevelConfig(gameName, levelFile) {
    if (!isSafeLevelFile(levelFile)) {
        throw createHttpError(400, "Invalid level file");
    }

    const { gameDir } = getGameDir(gameName);

    if (levelFile.toLowerCase() === "flexible.json") {
        ensureFlexibleConfig(gameName);
    }

    const configPath = path.join(gameDir, levelFile);

    if (!fs.existsSync(configPath)) {
        throw createHttpError(404, "Level config not found");
    }

    const config = safeReadJson(configPath, null);
    if (!config || typeof config !== "object") {
        throw createHttpError(500, "Failed to read level config");
    }

    return config;
}

function readFlexibleConfig(gameName) {
    ensureFlexibleConfig(gameName);
    return readLevelConfig(gameName, "flexible.json");
}

function saveFlexibleConfig(gameName, configPayload) {
    if (!configPayload || typeof configPayload !== "object" || Array.isArray(configPayload)) {
        throw createHttpError(400, "Flexible config must be a JSON object");
    }

    const flexiblePath = ensureFlexibleConfig(gameName);

    const normalized = {
        ...configPayload,
        level: "flexible.json",
        type: String(configPayload.type || gameName).toLowerCase()
    };

    safeWriteJson(flexiblePath, normalized);

    return safeReadJson(flexiblePath, normalized);
}

module.exports = {
    ensureGameName,
    getFrontendIndexPath,
    listGames,
    listLevelFiles,
    readLevelConfig,
    readFlexibleConfig,
    saveFlexibleConfig
};

