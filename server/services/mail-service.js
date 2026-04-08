const nodemailer = require("nodemailer");

const { buildSignupWelcomeEmail } = require("../templates/signup-welcome-email");

// Reads mail credentials only from environment variables to keep setup simple.
function readMailEnv() {
    const user =
        process.env.GMAIL ||
        process.env.SMTP_USER ||
        process.env.EMAIL_USER ||
        process.env.MAIL_USER ||
        process.env.GMAIL_USER ||
        process.env.GMAIL_EMAIL ||
        "";

    const pass =
        process.env.APP_PASSWORD ||
        process.env.GMAIL_APP_PASSWORD ||
        process.env.SMTP_PASS ||
        process.env.SMTP_PASSWORD ||
        "";

    return {
        user: String(user).trim(),
        pass: String(pass).replace(/\s/g, "").trim()
    };
}

function isMailConfigured() {
    const { user, pass } = readMailEnv();
    return Boolean(user && pass);
}

function createTransporter() {
    const { user, pass } = readMailEnv();
    if (!user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass }
    });
}

async function sendSignupWelcomeMail({ to, username, passwordPlain }) {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn("Tap-Tap mail: set GMAIL and APP_PASSWORD in .env to enable email.");
        return { sent: false, reason: "not_configured" };
    }

    const { subject, text, html } = buildSignupWelcomeEmail({
        username,
        email: to,
        passwordPlain
    });

    const fromName = process.env.MAIL_FROM_NAME || "Tap Tap";
    const from = `"${fromName}" <${readMailEnv().user}>`;

    await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html
    });
    
    return { sent: true };
}

async function sendTestMail(to) {
    const transporter = createTransporter();
    if (!transporter) {
        const err = new Error("Mail is not configured (set GMAIL and APP_PASSWORD)");
        err.status = 503;
        throw err;
    }

    const fromName = process.env.MAIL_FROM_NAME || "Tap Tap";
    const from = `"${fromName}" <${readMailEnv().user}>`;

    await transporter.sendMail({
        from,
        to,
        subject: "Tap Tap - mail test",
        text: "If you received this, Nodemailer and Gmail SMTP are working.",
        html: "<p>If you received this, Nodemailer and Gmail SMTP are working.</p>"
    });
}

module.exports = {
    isMailConfigured,
    sendSignupWelcomeMail,
    sendTestMail
};
