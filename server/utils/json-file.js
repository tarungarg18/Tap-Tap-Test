const fs = require("fs");

function safeReadJson(filePath, fallbackValue) {
    try {
        if (!fs.existsSync(filePath)) return fallbackValue;
        const raw = fs.readFileSync(filePath, "utf8");
        return JSON.parse(raw);
    } catch {
        return fallbackValue;
    }
}

function safeWriteJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

module.exports = {
    safeReadJson,
    safeWriteJson
};

