const { parseAuthToken } = require("../services/auth-service");
const { createHttpError } = require("../utils/errors");

function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || "";
        const parts = authHeader.split(" ");

        if (parts.length !== 2 || parts[0] !== "Bearer") {
            throw createHttpError(401, "Missing or invalid auth token");
        }

        const payload = parseAuthToken(parts[1]);
        req.auth = {
            userId: payload.sub,
            username: payload.username,
            email: payload.email
        };

        next();
    } catch (err) {
        next(createHttpError(401, "Unauthorized"));
    }
}

module.exports = {
    requireAuth
};
