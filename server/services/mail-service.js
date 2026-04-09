const nodemailer = require("nodemailer");
const dns = require("dns");

const { buildSignupWelcomeEmail } = require("../templates/signup-welcome-email");

function buildTransporter() {
    const user = String(process.env.GMAIL || "").trim();
    const pass = String(process.env.APP_PASSWORD || "").trim().replace(/\s+/g, "");
    if (!user || !pass) return null;

    return nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user, pass },
        requireTLS: true,
        tls: { servername: "smtp.gmail.com" },
        lookup: (hostname, _opts, cb) => dns.lookup(hostname, { family: 4, all: false }, cb)
    });
}

function isMailConfigured() {
    return Boolean(process.env.GMAIL && process.env.APP_PASSWORD);
}

async function sendSignupWelcomeMail({ to, username, passwordPlain }) {
    const transporter = buildTransporter();
    if (!transporter) return { sent: false, reason: "not_configured" };

    const { subject, text, html } = buildSignupWelcomeEmail({ username, email: to, passwordPlain });
    await transporter.sendMail({
        from: process.env.GMAIL,
        to,
        subject,
        text,
        html
    });
    return { sent: true };
}

async function sendTestMail(to) {
    const transporter = buildTransporter();
    if (!transporter) {
        const err = new Error("Mail is not configured (set GMAIL and APP_PASSWORD)");
        err.status = 503;
        throw err;
    }
    await transporter.sendMail({
        from: process.env.GMAIL,
        to,
        subject: "Tap Tap - mail test",
        text: "If you received this, Gmail SMTP is working.",
        html: "<p>If you received this, Gmail SMTP is working.</p>"
    });
    return { sent: true };
}

async function sendContactAcknowledgementMail({ to, name, email, phone, message }) {
    const transporter = buildTransporter();
    if (!transporter) {
        const err = new Error("Mail is not configured (set GMAIL and APP_PASSWORD)");
        err.status = 503;
        throw err;
    }
    const subject = "Tap Tap Contact Request Received";
    const text = [
        `Hello ${name || "there"},`,
        "",
        "Thank you for contacting the Tap Tap team.",
        "We have received your message and our team will reach out to you soon.",
        "",
        `Email: ${email}`,
        `Phone: ${phone}`,
        "",
        message || "(no message)"
    ].join("\n");

    await transporter.sendMail({
        from: process.env.GMAIL,
        to,
        replyTo: email,
        subject,
        text
    });
    return { sent: true };
}

module.exports = {
    isMailConfigured,
    sendSignupWelcomeMail,
    sendTestMail,
    sendContactAcknowledgementMail
};
