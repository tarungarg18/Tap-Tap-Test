const express = require("express");
const nodemailer = require("nodemailer");

const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function buildTransporter() {
    const user = String(process.env.GMAIL || "").trim();
    const pass = String(process.env.APP_PASSWORD || "").trim().replace(/\s+/g, "");
    if (!user || !pass) return null;
    return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

function isConfigured() {
    return Boolean(process.env.GMAIL && process.env.APP_PASSWORD);
}

router.get("/status", (req, res) => {
    res.json({ configured: isConfigured() });
});

router.post("/test", requireAuth, async (req, res, next) => {
    try {
        if (!isConfigured()) {
            res.status(503).json({ error: "Mail is not configured (set GMAIL and APP_PASSWORD)" });
            return;
        }
        const transporter = buildTransporter();
        const to = req.auth.email;
        await transporter.sendMail({
            from: process.env.GMAIL,
            to,
            subject: "Tap Tap - mail test",
            text: "If you received this, Gmail SMTP is working."
        });
        res.json({ ok: true, message: `Test email sent to ${to}` });
    } catch (err) {
        next(err);
    }
});

router.post("/contact", async (req, res, next) => {
    try {
        if (!isConfigured()) {
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
        if (!/^[0-9+\-\s]{7,20}$/.test(phone)) {
            res.status(400).json({ error: "Please enter a valid phone number." });
            return;
        }
        if (!message || message.length < 5) {
            res.status(400).json({ error: "Please add a short message." });
            return;
        }

        const transporter = buildTransporter();
        const body = [
            `Name: ${name}`,
            `Email: ${email}`,
            `Phone: ${phone}`,
            "",
            message
        ].join("\n");

        await transporter.sendMail({
            from: process.env.GMAIL,
            to: process.env.GMAIL, // send to self inbox
            replyTo: email,
            subject: "New contact form submission",
            text: body
        });

        res.json({ ok: true, message: "Message sent successfully" });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
