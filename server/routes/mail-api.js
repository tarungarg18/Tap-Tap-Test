const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { isMailConfigured, sendTestMail, sendContactAcknowledgementMail } = require("../services/mail-service");

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

router.post("/contact", async (req, res, next) => {
    try {
        if (!isMailConfigured()) {
            res.status(503).json({ error: "Mail is not configured (set GMAIL and APP_PASSWORD)" });
            return;
        }

        const name = String(req.body?.name || "").trim();
        const email = String(req.body?.email || "").trim();
        const phone = String(req.body?.phone || "").trim();
        const message = String(req.body?.message || "").trim();

        if (!name || name.length < 2) {
            res.status(400).json({ error: "Please enter your full name." });
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ error: "Please enter a valid email address." });
            return;
        }

        if (!/^\+?[0-9][0-9\s-]{7,18}$/.test(phone)) {
            res.status(400).json({ error: "Please enter a valid phone number." });
            return;
        }

        if (!message || message.length < 10) {
            res.status(400).json({ error: "Please add a short message so our team knows how to help." });
            return;
        }

        await sendContactAcknowledgementMail({
            to: email,
            name,
            email,
            phone,
            message
        });

        res.json({
            ok: true,
            message: "Your request was received. Our team will reach out soon, and a confirmation email has been sent."
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
