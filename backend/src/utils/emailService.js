import nodemailer from "nodemailer";
import { Setting } from "../models/Setting.js";
import { logger } from "./logger.js";

class EmailService {
    async getSmtpConfig() {
    const settings = await Setting.findOne({ key: "main" }).lean();

    if (!settings?.smtpHost || !settings?.smtpUser) {
      throw new Error(
        "SMTP is not configured. Go to Admin → Settings → Credentials and fill in SMTP details.",
      );
    }

    return {
      host: settings.smtpHost,
      port: Number(settings.smtpPort) || 587,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword,
      },
      from: settings.smtpFrom || settings.smtpUser,
    };
  }

  async getTransporter() {
    const { host, port, auth } = await this.getSmtpConfig();
    return nodemailer.createTransport({ host, port, auth });
  }

  async sendMail({ to, subject, html, text }) {
    const config = await this.getSmtpConfig();
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      auth: config.auth,
    });

    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
    });

    logger.info("Email sent", { messageId: info.messageId, to, subject });
    return info;
  }

  async sendTestEmail(to) {
    return this.sendMail({
      to,
      subject: "Test Email — SMTP Configuration",
      html: `
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
                    <h2 style="color:#4f46e5;margin-top:0;">✅ SMTP Configuration Working</h2>
                    <p style="color:#334155;">This is a test email to confirm your SMTP settings are configured correctly in your Enterprise E-Commerce admin panel.</p>
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
                    <p style="color:#94a3b8;font-size:13px;margin:0;">Sent from Enterprise E-Commerce &mdash; Admin Settings</p>
                </div>
            `,
    });
  }
}

export const emailService = new EmailService();
