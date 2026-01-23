import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../utils/logger';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    private isConfigured: boolean = false;

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        if (config.SMTP_HOST && config.SMTP_USER) {
            // Use port 465 with secure connection for better reliability on cloud platforms
            // Port 587 with STARTTLS can be blocked by some cloud providers
            const smtpPort = config.SMTP_PORT || 587;
            const isSecure = smtpPort === 465 || smtpPort === 2465;

            this.transporter = nodemailer.createTransport({
                host: config.SMTP_HOST,
                port: smtpPort,
                secure: isSecure, // true for 465, false for other ports
                auth: {
                    user: config.SMTP_USER,
                    pass: config.SMTP_PASS,
                },
                // Updated timeout settings to prevent ETIMEDOUT
                connectionTimeout: 30000, // 30 seconds (was 10)
                greetingTimeout: 30000,   // 30 seconds (was 10)
                socketTimeout: 60000,     // 60 seconds (was 15)
                dnsTimeout: 30000,        // 30 seconds
                // Force IPv4 to avoid IPv6 connection issues on some cloud providers
                family: 4,
                // Enable debug logging for troubleshooting
                debug: true,
                logger: true,
                // Disable pooling on serverless/cloud environments to prevent stale connection timeouts
                pool: false,
            } as nodemailer.TransportOptions);
            this.isConfigured = true;
            logger.info(`Email service initialized (host: ${config.SMTP_HOST}, port: ${smtpPort}, secure: ${isSecure})`);
        } else {
            logger.warn('Email service not configured. Email sending is disabled.');
        }
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        if (!this.isConfigured || !this.transporter) {
            logger.warn('Email transporter not configured, skipping email send');
            return false;
        }

        try {
            const mailOptions = {
                from: `"${config.SMTP_FROM_NAME || 'Lateral Flow Scanner'}" <${config.SMTP_FROM || config.SMTP_USER}>`,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text || this.htmlToText(options.html),
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Email sent to ${options.to}: ${info.messageId}`);
            return true;
        } catch (error) {
            logger.error('Email send error:', error);
            return false;
        }
    }

    async sendVerificationEmail(email: string, name: string, otp: string): Promise<boolean> {
        const subject = 'Verify your email - Lateral Flow Scanner';
        const html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0;">Email Verification</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p>Hello ${name},</p>
                    <p>Thank you for registering. Please use the OTP code below to verify your email:</p>
                    <div style="background: white; border: 2px solid #3b82f6; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                        <div style="font-size: 28px; font-weight: bold; color: #3b82f6; letter-spacing: 8px;">${otp}</div>
                        <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">This code expires in 10 minutes</p>
                    </div>
                    <p style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px;">
                        <strong>⚠️ Security Notice:</strong> Never share this code with anyone.
                    </p>
                </div>
                <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 20px;">
                    © ${new Date().getFullYear()} Lateral Flow Scanner. All rights reserved.
                </p>
            </div>
        `;
        return this.sendEmail({ to: email, subject, html });
    }

    async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<boolean> {
        const resetUrl = `${config.FRONTEND_URL || 'https://app.lateralflowscanner.com'}/reset-password?token=${resetToken}`;
        const subject = 'Reset your password - Lateral Flow Scanner';
        const html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0;">🔐 Password Reset</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p>Hello ${name},</p>
                    <p>We received a request to reset your password. Click the button below:</p>
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p style="font-size: 14px; color: #64748b;">Or copy this link:</p>
                    <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 14px;">${resetUrl}</div>
                    <p style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin-top: 20px; border-radius: 4px;">
                        <strong>⏰ This link expires in 1 hour.</strong><br>
                        If you didn't request this, please ignore this email.
                    </p>
                </div>
            </div>
        `;
        return this.sendEmail({ to: email, subject, html });
    }

    async sendPasswordResetOTP(email: string, name: string, otp: string): Promise<boolean> {
        const subject = 'Password Reset OTP - Lateral Flow Scanner';
        const html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0;">Password Reset</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p>Hello ${name},</p>
                    <p>Use this OTP to reset your password:</p>
                    <div style="background: white; border: 2px solid #ef4444; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                        <div style="font-size: 36px; font-weight: bold; color: #ef4444; letter-spacing: 8px;">${otp}</div>
                        <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">This code expires in 10 minutes</p>
                    </div>
                </div>
            </div>
        `;
        return this.sendEmail({ to: email, subject, html });
    }

    async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
        const subject = 'Welcome to Lateral Flow Scanner! 🎉';
        const html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0;">Welcome, ${name}! 🎉</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p>Thank you for joining Lateral Flow Scanner!</p>
                    <h3>Here's what you can do:</h3>
                    <ul style="line-height: 2;">
                        <li>📸 <strong>Capture Tests</strong> - Take high-quality photos of lateral flow tests</li>
                        <li>🎯 <strong>Auto Detection</strong> - Smart border detection and alignment</li>
                        <li>📊 <strong>Track History</strong> - View all your captures and metadata</li>
                    </ul>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${config.FRONTEND_URL || 'https://app.lateralflowscanner.com'}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Get Started</a>
                    </div>
                </div>
            </div>
        `;
        return this.sendEmail({ to: email, subject, html });
    }

    async sendLoginAlertEmail(email: string, name: string, deviceInfo: string, ipAddress: string): Promise<boolean> {
        const subject = 'New Login Detected - Lateral Flow Scanner';
        const html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #1e293b; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h2 style="margin: 0;">🔔 New Login Alert</h2>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p>Hello ${name},</p>
                    <p>A new login was detected on your account:</p>
                    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                        <p style="margin: 5px 0;"><strong>Device:</strong> ${deviceInfo}</p>
                        <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ipAddress}</p>
                    </div>
                    <p>If this wasn't you, please change your password immediately.</p>
                </div>
            </div>
        `;
        return this.sendEmail({ to: email, subject, html });
    }

    private htmlToText(html: string): string {
        return html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}

export const emailService = new EmailService();
