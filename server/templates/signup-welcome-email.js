function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * HTML + plain-text content for the signup confirmation email.
 * @param {{ username: string, email: string, passwordPlain: string }} params
 */
function buildSignupWelcomeEmail({ username, email, passwordPlain }) {
    const u = escapeHtml(username);
    const e = escapeHtml(email);
    const p = escapeHtml(passwordPlain);

    const subject = "Welcome to Tap Tap — your account details";

    const text = [
        `Hi ${username},`,
        "",
        "Thanks for creating a Tap Tap account. Here are your login details:",
        "",
        `Username: ${username}`,
        `Email: ${email}`,
        `Password: ${passwordPlain}`,
        "",
        "Keep this email private. You can log in with your username or email.",
        "",
        "— Tap Tap"
    ].join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2d4e;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f4ff;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(31,45,78,0.12);">
          <tr>
            <td style="padding:28px 28px 8px;background:linear-gradient(135deg,#1f2f7a,#2f4ea0);color:#ffffff;">
              <div style="font-size:22px;font-weight:800;letter-spacing:0.02em;">Tap Tap</div>
              <div style="font-size:14px;opacity:0.92;margin-top:4px;">Your games hub</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Hi <strong>${u}</strong>,</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#3d4f7a;">
                Your account is ready. Use the details below to sign in anytime.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7ff;border-radius:12px;border:1px solid #d8e2fb;">
                <tr>
                  <td style="padding:16px 18px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#5a6b94;margin-bottom:4px;">Username</div>
                    <div style="font-size:16px;font-weight:700;color:#1f2d4e;">${u}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 18px 16px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#5a6b94;margin-bottom:4px;">Email</div>
                    <div style="font-size:15px;color:#1f2d4e;">${e}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 18px 18px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#5a6b94;margin-bottom:4px;">Password</div>
                    <div style="font-size:15px;font-family:Consolas,monospace;background:#fff;padding:10px 12px;border-radius:8px;border:1px solid #e2e8fb;color:#1f2d4e;">${p}</div>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#66739a;">
                Treat this message like a credential: don’t forward it, and avoid sharing your password.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;border-top:1px solid #e8edf7;">
              <p style="margin:0;font-size:12px;color:#8a96b5;">Sent automatically when you signed up for Tap Tap.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return { subject, text, html };
}

module.exports = {
    buildSignupWelcomeEmail,
    escapeHtml
};
