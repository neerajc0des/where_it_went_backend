import 'dotenv/config';
import nodemailer from "nodemailer";

// Configure this with your SMTP provider (e.g., SendGrid, AWS SES, or Gmail for testing)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendVerificationEmail = async (email: string, token: string) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || process.env.API_URL || "http://localhost:8080";
    

    const verificationLink = `${baseUrl}/auth/verify-email?token=${token}`;

    const info = await transporter.sendMail({
        from: '"Finance Tracker" <noreply@financetracker.com>',
        to: email,
        subject: "Verify your email address",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome!</h2>
            <p>Please verify your email address to activate your account.</p>
            
            <div style="margin: 30px 0;">
                <a href="${verificationLink}" style="background-color: #000; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Verify Email
                </a>
            </div>
            
            <p><strong>Testing in Postman?</strong> Here is your raw token to copy/paste:</p>
            <code style="background: #f4f4f4; padding: 10px; border-radius: 4px; display: block; word-break: break-all;">
                ${token}
            </code>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
                This link will expire in 24 hours.
            </p>
            </div>
        `,
        });

        console.log(`Verification email sent to ${email}. Message ID: ${info.messageId}`);
    } catch (error) {
        console.error("Error sending verification email:", error);
    }
};


export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset your WhereItWent password',
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset. Click the link below:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in <strong>30 minutes</strong>.</p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
};