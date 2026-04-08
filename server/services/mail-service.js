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

function buildContactAcknowledgementEmail({ name, email, phone, message }) {
    const safeName = String(name || "there").trim();
    const safeEmail = String(email || "").trim();
    const safePhone = String(phone || "").trim();
    const safeMessage = String(message || "").trim();

    return {
        subject: "Tap Tap Contact Request Received",
        text: [
            `Hello ${safeName},`,
            "",
            "Thank you for contacting the Tap Tap team.",
            "We have received your message and our team will reach out to you soon.",
            "",
            "You can also connect with our team directly:",
            "Tara Chand | +91 7056202923 | tarachandgarg79@gmail.com",
            "Vasudev | +91 7678971445 | vasudevkumar1445@gmail.com",
            "",
            "Your submitted details:",
            `Name: ${safeName}`,
            `Email: ${safeEmail}`,
            `Phone: ${safePhone}`,
            `Message: ${safeMessage}`,
            "",
            "Regards,",
            "Tap Tap Team"
        ].join("\n"),
        html: `
            <div style="margin:0;padding:32px 18px;background:#f3f7ff;font-family:Arial,sans-serif;color:#10213b;">
                <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 45px rgba(16,33,59,0.12);">
                    <div style="padding:28px 32px;background:linear-gradient(135deg,#0f7bff 0%,#0a47b8 100%);color:#ffffff;">
                        <div style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.82;">Tap Tap</div>
                        <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">Thanks for reaching out, ${safeName}.</h1>
                    </div>
                    <div style="padding:28px 32px;">
                        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#30415f;">
                            We have received your contact request and our team will reach out to you soon.
                            If you prefer, you can also contact our team directly using the details below.
                        </p>
                        <div style="display:grid;gap:12px;margin:22px 0;">
                            <div style="padding:16px 18px;border-radius:18px;background:#eff5ff;border:1px solid #d8e6ff;">
                                <div style="font-weight:700;font-size:17px;color:#10213b;">Tara Chand</div>
                                <div style="margin-top:6px;font-size:14px;color:#48607f;">+91 7056202923</div>
                                <div style="margin-top:4px;font-size:14px;color:#48607f;">tarachandgarg79@gmail.com</div>
                            </div>
                            <div style="padding:16px 18px;border-radius:18px;background:#eff5ff;border:1px solid #d8e6ff;">
                                <div style="font-weight:700;font-size:17px;color:#10213b;">Vasudev</div>
                                <div style="margin-top:6px;font-size:14px;color:#48607f;">+91 7678971445</div>
                                <div style="margin-top:4px;font-size:14px;color:#48607f;">vasudevkumar1445@gmail.com</div>
                            </div>
                        </div>
                        <div style="padding:18px;border-radius:18px;background:#0f172a;color:#e5efff;">
                            <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.72;">Your request</div>
                            <div style="margin-top:12px;font-size:14px;line-height:1.8;">
                                <div><strong>Name:</strong> ${safeName}</div>
                                <div><strong>Email:</strong> ${safeEmail}</div>
                                <div><strong>Phone:</strong> ${safePhone}</div>
                                <div><strong>Message:</strong> ${safeMessage || "No message provided."}</div>
                            </div>
                        </div>
                        <p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:#5a6d8f;">
                            Regards,<br />Tap Tap Team
                        </p>
                    </div>
                </div>
            </div>
        `
    };
}

async function sendContactAcknowledgementMail({ to, name, email, phone, message }) {
    const transporter = createTransporter();
    if (!transporter) {
        const err = new Error("Mail is not configured (set GMAIL and APP_PASSWORD)");
        err.status = 503;
        throw err;
    }

    const { subject, text, html } = buildContactAcknowledgementEmail({ name, email, phone, message });
    const fromName = process.env.MAIL_FROM_NAME || "Tap Tap";
    const from = `"${fromName}" <${readMailEnv().user}>`;

    await transporter.sendMail({
        from,
        to,
        replyTo: readMailEnv().user,
        subject,
        text,
        html
    });

    return { sent: true };
}

module.exports = {
    isMailConfigured,
    sendSignupWelcomeMail,
    sendTestMail,
    sendContactAcknowledgementMail
};
