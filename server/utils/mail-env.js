const fs = require("fs");
const path = require("path");

const dotenv = require("dotenv");

const ENV_PATH = path.join(__dirname, "..", "..", ".env");

const USER_KEYS = ["GMAIL", "SMTP_USER", "EMAIL_USER", "MAIL_USER", "GMAIL_USER", "GMAIL_EMAIL"];

const PASS_KEYS = ["APP_PASSWORD", "GMAIL_APP_PASSWORD", "SMTP_PASS", "SMTP_PASSWORD"];

function stripBom(value) {
    return String(value || "")
        .replace(/^\uFEFF/, "")
        .trim();
}

function pickFromProcess(keys) {
    for (const k of keys) {
        const raw = process.env[k];
        if (raw == null) continue;
        const v = stripBom(raw);
        if (v.length > 0) return v;
    }
    return "";
}

function pickFromParsed(parsed, keys) {
    if (!parsed || typeof parsed !== "object") return "";

    for (const name of keys) {
        const direct = parsed[name];
        if (direct != null && String(direct).trim()) {
            return stripBom(direct);
        }
    }

    const upperKeys = Object.keys(parsed);
    for (const name of keys) {
        const want = name.toLowerCase();
        const found = upperKeys.find((k) => k.toLowerCase() === want);
        if (found) {
            const v = parsed[found];
            if (v != null && String(v).trim()) {
                return stripBom(v);
            }
        }
    }

    return "";
}

function readParsedEnvFile() {
    try {
        if (!fs.existsSync(ENV_PATH)) {
            return {};
        }
        return dotenv.parse(fs.readFileSync(ENV_PATH));
    } catch {
        return {};
    }
}

let cache = null;

/**
 * Prefer process.env (Docker / hosting), then parse .env on disk (fixes nodemon / partial injection).
 */
function loadMailEnv() {
    if (cache) {
        return cache;
    }

    let user = pickFromProcess(USER_KEYS);
    let passRaw = pickFromProcess(PASS_KEYS);
    let pass = passRaw.replace(/\s/g, "");

    const parsed = readParsedEnvFile();

    if (!user) {
        user = pickFromParsed(parsed, USER_KEYS);
    }

    if (!pass) {
        pass = pickFromParsed(parsed, PASS_KEYS).replace(/\s/g, "");
    }

    cache = { user, pass };
    return cache;
}

function resetMailEnvCache() {
    cache = null;
}

module.exports = {
    loadMailEnv,
    resetMailEnvCache,
    ENV_PATH
};
