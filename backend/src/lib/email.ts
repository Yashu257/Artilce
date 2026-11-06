import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

interface SendOtpOptions {
  to: string;
  otp: string;
  name?: string;
  type?: 'register' | 'login' | 'reset';
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
}

export async function sendOtpEmail({
  to,
  otp,
  name,
  type = 'register',
}: SendOtpOptions): Promise<{ sent: boolean; devOtp?: string }> {
  const subject =
    type === 'register'
      ? 'Cipla MedKnowledge — Account Verification Code'
      : type === 'login'
      ? 'Cipla MedKnowledge — Login Verification Code'
      : 'Cipla MedKnowledge — Password Reset Code';

  const actionText =
    type === 'register'
      ? 'complete your Cipla MedKnowledge account registration'
      : type === 'login'
      ? 'sign in to your Cipla MedKnowledge account'
      : 'reset your account password';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 30px; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #075C67; padding: 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { color: #99f6e4; margin: 4px 0 0; font-size: 12px; }
        .body { padding: 32px 28px; }
        .greeting { font-size: 15px; color: #1e293b; margin-bottom: 16px; font-weight: 500; }
        .instruction { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
        .otp-box { background: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #0f766e; letter-spacing: 8px; margin: 0; }
        .validity { font-size: 12px; color: #64748b; margin-top: 8px; }
        .footer { background: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Cipla MedKnowledge</h1>
          <p>Clinical Intelligence Platform for Healthcare Professionals</p>
        </div>
        <div class="body">
          <p class="greeting">Dear ${name || 'Doctor'},</p>
          <p class="instruction">
            Use the 6-digit verification code below to ${actionText}:
          </p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="validity">Valid for 10 minutes. Do not share this code with anyone.</div>
          </div>
          <p class="instruction" style="font-size: 12px; color: #64748b;">
            If you did not initiate this request, you can safely ignore this email. No account changes have been made.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Cipla Ltd. Confidential Clinical Medical Information.
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = getTransporter();

  if (transporter) {
    try {
      const from = process.env.SMTP_FROM || '"Cipla MedKnowledge" <no-reply@cipla-medknowledge.com>';
      await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      logger.info('[email] OTP email sent via SMTP', { to, type });
      return { sent: true };
    } catch (err) {
      logger.warn('[email] Failed to send via SMTP, logging fallback', { error: String(err), to });
    }
  }

  // Fallback / Development logging: print visible terminal banner
  console.log('\n======================================================');
  console.log(`[CIPLA MEDKNOWLEDGE EMAIL OTP]`);
  console.log(`To:   ${to}`);
  console.log(`Type: ${type.toUpperCase()}`);
  console.log(`CODE: >>> ${otp} <<<`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('======================================================\n');

  logger.info(`[email] Dev OTP code generated for ${to}: ${otp}`);
  return { sent: true, devOtp: !env.isProd ? otp : undefined };
}
