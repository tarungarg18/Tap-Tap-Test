const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { createHttpError } = require("../utils/errors");
const { sendSignupWelcomeMail } = require("./mail-service");
const { getUserLeaderboard } = require("./user-leaderboard-service");

const SALT_ROUNDS = 10;

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("JWT_SECRET environment variable is required in production");
        }
        return "tap_tap_dev_secret_change_me";
    }
    return secret;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

function sanitizeIdentifier(value) {
    return String(value || "").trim().toLowerCase();
}

function signAuthToken(user) {
    return jwt.sign(
        {
            sub: String(user._id),
            username: user.username,
            email: user.email
        },
        getJwtSecret(),
        { expiresIn: "7d" }
    );
}

function parseAuthToken(token) {
    return jwt.verify(token, getJwtSecret());
}

async function buildUserPayload(userDoc, options = {}) {
    if (!userDoc) {
        throw createHttpError(404, "User not found");
    }

    const leaderboard = await getUserLeaderboard(userDoc._id, { recalc: options.recalcLeaderboard });

    return {
        id: String(userDoc._id),
        username: userDoc.username,
        email: userDoc.email,
        createdAt: userDoc.createdAt,
        totalScore: leaderboard.totalScore,
        globalRank: leaderboard.globalRank
    };
}

async function signup({ username, email, password }) {
    const normalizedUsername = sanitizeIdentifier(username);
    const normalizedEmail = sanitizeIdentifier(email);

    if (normalizedUsername.length < 3 || normalizedUsername.length > 32) {
        throw createHttpError(400, "Username must be between 3 and 32 characters");
    }

    if (!isValidEmail(normalizedEmail)) {
        throw createHttpError(400, "Invalid email format");
    }

    if (typeof password !== "string" || password.length < 6) {
        throw createHttpError(400, "Password must be at least 6 characters");
    }

    const existing = await User.findOne({
        $or: [{ username: normalizedUsername }, { email: normalizedEmail }]
    }).lean();

    if (existing) {
        if (existing.username === normalizedUsername) {
            throw createHttpError(409, "Username already exists");
        }
        throw createHttpError(409, "Email already exists");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash
    });

    const token = signAuthToken(user);
    const userPayload = await buildUserPayload(user, { recalcLeaderboard: true });

    const payload = {
        token,
        user: userPayload
    };

    void sendSignupWelcomeMail({
        to: normalizedEmail,
        username: normalizedUsername,
        passwordPlain: password
    }).catch((err) => {
        console.error("Tap-Tap welcome email failed:", err.message);
    });

    return payload;
}

async function login({ identifier, password }) {
    const normalizedIdentifier = sanitizeIdentifier(identifier);

    if (!normalizedIdentifier || typeof password !== "string") {
        throw createHttpError(400, "Invalid credentials");
    }

    const user = await User.findOne({
        $or: [{ username: normalizedIdentifier }, { email: normalizedIdentifier }]
    }).select("+passwordHash");

    if (!user) {
        throw createHttpError(401, "Invalid credentials");
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
        throw createHttpError(401, "Invalid credentials");
    }

    const token = signAuthToken(user);
    const userPayload = await buildUserPayload(user, { recalcLeaderboard: true });

    return {
        token,
        user: userPayload
    };
}

async function getMe(userId) {
    const user = await User.findById(userId).lean();

    if (!user) {
        throw createHttpError(404, "User not found");
    }

    const userPayload = await buildUserPayload(user, { recalcLeaderboard: false });

    return userPayload;
}

module.exports = {
    signup,
    login,
    getMe,
    parseAuthToken
};

