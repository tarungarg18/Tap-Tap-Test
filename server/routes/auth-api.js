const express = require("express");

const { login, signup, getMe } = require("../services/auth-service");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/signup", async (req, res, next) => {
    try {
        const result = await signup(req.body || {});
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
});

router.post("/login", async (req, res, next) => {
    try {
        const result = await login(req.body || {});
        res.json(result);
    } catch (err) {
        next(err);
    }
});

router.get("/me", requireAuth, async (req, res, next) => {
    try {
        const profile = await getMe(req.auth.userId);
        res.json({ user: profile });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

