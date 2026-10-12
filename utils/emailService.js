import nodemailer from "nodemailer";

/**
 * Send OTP Verification Email
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit numeric OTP code
 * @param {string} userName - Name of the user
 */
export const sendOtpEmail = async (toEmail, otp, userName = "Valued Customer") => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  // HTML Email Template with FreshRoot Organic Branding
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f5f0; margin: 0; padding: 20px; color: #1e293b; }
          .email-card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid rgba(102,149,64,0.2); }
          .email-header { background: linear-gradient(135deg, #031E0D 0%, #164627 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .brand-title { font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #eedbb8; margin: 0; text-transform: uppercase; }
          .brand-subtitle { font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 4px; }
          .email-body { padding: 32px 28px; text-align: center; }
          .greeting { font-size: 18px; font-weight: 700; color: #031e0d; margin-bottom: 12px; }
          .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .otp-box { display: inline-block; background: #ecfdf5; border: 2px dashed #10b981; border-radius: 12px; padding: 16px 36px; margin: 8px 0 24px 0; }
          .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #047857; font-family: monospace; }
          .expiry-note { font-size: 12px; color: #ef4444; font-weight: 600; margin-bottom: 24px; }
          .security-tip { font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 18px; }
          .email-footer { background: #fafaf9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="email-card">
          <div class="email-header">
            <h1 class="brand-title">🌿 FRESHROOT ORGANICS</h1>
            <p class="brand-subtitle">Password Security & Verification</p>
          </div>
          <div class="email-body">
            <h2 class="greeting">Hello, ${userName}!</h2>
            <p class="message">
              We received a request to reset the password for your FreshRoot account. Use the one-time verification code (OTP) below to proceed:
            </p>
            <div class="otp-box">
              <span class="otp-code">${otp}</span>
            </div>
            <p class="expiry-note">⏱️ This code is valid for 10 minutes only. Do not share it with anyone.</p>
            <p class="security-tip">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </div>
          <div class="email-footer">
            © ${new Date().getFullYear()} FreshRoot Organics. Farm-to-table excellence delivered.
          </div>
        </div>
      </body>
    </html>
  `;

  if (!emailUser || !emailPass) {
    console.log("=================================================");
    console.log(`[EMAIL SIMULATION] OTP for ${toEmail}: ${otp}`);
    console.log("To send real emails, set EMAIL_USER and EMAIL_PASS in backend/.env");
    console.log("=================================================");
    return { success: true, simulated: true, otp };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const mailOptions = {
      from: `"FreshRoot Organics" <${emailUser}>`,
      to: toEmail,
      subject: `Your FreshRoot Password Reset Code: ${otp}`,
      html: htmlTemplate,
      text: `Hello ${userName},\n\nYour FreshRoot password reset verification code is: ${otp}\n\nThis code expires in 10 minutes. If you did not request this, please ignore this email.\n\nFreshRoot Organics`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Failed to send email via SMTP:", error);
    // Fallback log so dev testing is never blocked
    console.log(`[FALLBACK OTP CODE FOR ${toEmail}]: ${otp}`);
    return { success: true, fallback: true, error: error.message };
  }
};
