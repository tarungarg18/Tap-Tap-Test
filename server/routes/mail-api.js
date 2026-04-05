const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { isMailConfigured, sendTestMail } = require("../services/mail-service");

const router = express.Router();

/**
 * Whether GMAIL + APP_PASSWORD are set (no secrets returned).
 */
router.get("/status", (req, res) => {
    res.json({ configured: isMailConfigured() });
});

/**
 * Sends a test message to the authenticated user's email (backend / tooling only).
 */
router.post("/test", requireAuth, async (req, res, next) => {
    try {
        if (!isMailConfigured()) {
            res.status(503).json({ error: "Mail is not configured (set GMAIL and APP_PASSWORD)" });
            return;
        }

        const to = req.auth.email;
        if (!to) {
            res.status(400).json({ error: "No email on your account" });
            return;
        }

        await sendTestMail(to);
        res.json({ ok: true, message: `Test email sent to ${to}` });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
