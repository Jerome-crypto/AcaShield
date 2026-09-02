"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
class EmailService {
    transporter = null;
    constructor() {
        if (env_1.env.smtpUser && env_1.env.smtpUser !== "your_gmail_address@gmail.com" && env_1.env.smtpPass) {
            this.transporter = nodemailer_1.default.createTransport({
                host: env_1.env.smtpHost,
                port: env_1.env.smtpPort,
                secure: env_1.env.smtpPort === 465,
                auth: {
                    user: env_1.env.smtpUser,
                    pass: env_1.env.smtpPass,
                },
            });
            console.log(`Email service configured with SMTP: ${env_1.env.smtpHost}:${env_1.env.smtpPort}`);
        }
        else {
            console.log("Email service running in simulated development mode (SMTP credentials not configured).");
        }
    }
    async sendEmail(to, subject, html) {
        try {
            if (!this.transporter) {
                console.log("==================== SIMULATED EMAIL ====================");
                console.log(`To:      ${to}`);
                console.log(`Subject: ${subject}`);
                console.log(`Body:    ${html.replace(/<[^>]*>/g, " ").substring(0, 300)}...`);
                console.log("=========================================================");
                return true;
            }
            await this.transporter.sendMail({
                from: `"AcaShield Admin" <${env_1.env.smtpUser}>`,
                to,
                subject,
                html,
            });
            return true;
        }
        catch (error) {
            console.error("Error sending email via Nodemailer:", error);
            return false;
        }
    }
    async sendPasswordResetEmail(to, resetToken) {
        const resetUrl = `${env_1.env.clientUrl}/reset-password?token=${resetToken}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E5E7EB; rounded: 10px;">
        <h2 style="color: #065F46;">AcaShield Password Reset</h2>
        <p>You requested a password reset for your AcaShield account. Please click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #065F46; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>This link is valid for 1 hour.</p>
        <hr style="border: 0; border-top: 1px solid #E5E7EB; margin-top: 20px;">
        <p style="font-size: 11px; color: #9CA3AF;">Securely sent by AcaShield Academic Integrity System.</p>
      </div>
    `;
        return this.sendEmail(to, "Reset your AcaShield password", html);
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
exports.default = exports.emailService;
