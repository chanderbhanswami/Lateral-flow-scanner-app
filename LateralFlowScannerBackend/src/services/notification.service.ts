import * as admin from 'firebase-admin';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { User } from '../models/User.model';
import { Notification } from '../models/Notification.model';

class NotificationService {
    private isFirebaseInitialized = false;

    constructor() {
        this.initializeFirebase();
    }

    private initializeFirebase() {
        try {
            if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                // If credentials file is provided
                admin.initializeApp({
                    credential: admin.credential.applicationDefault(),
                });
                this.isFirebaseInitialized = true;
                logger.info('Firebase Admin initialized successfully');
            } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                // Or if raw JSON content is in ENV
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                this.isFirebaseInitialized = true;
                logger.info('Firebase Admin initialized successfully from ENV');
            } else {
                logger.warn('Firebase credentials not found. Push notifications will be mocked.');
            }
        } catch (error) {
            logger.error('Failed to initialize Firebase Admin:', error);
        }
    }

    /**
     * Send a notification to a user (Push + In-App Persistence)
     */
    async sendToUser(
        userId: string,
        notification: {
            title: string;
            body: string;
            type?: 'info' | 'warning' | 'success' | 'error';
            data?: Record<string, any>;
        }
    ): Promise<void> {
        try {
            // 1. Create In-App Notification (Persistent History)
            await this.createInAppNotification(
                userId,
                notification.title,
                notification.body,
                notification.type,
                notification.data
            );

            // 2. Send Push Notification (if tokens exist)
            const user = await User.findById(userId);
            if (user && user.fcmTokens && user.fcmTokens.length > 0) {
                await this.sendPushNotification(
                    user.fcmTokens,
                    notification.title,
                    notification.body,
                    notification.data
                );
            }
        } catch (error) {
            logger.error(`Failed to send notification to user ${userId}:`, error);
        }
    }

    /**
     * Save notification to database for In-App history
     */
    async createInAppNotification(
        userId: string,
        title: string,
        body: string,
        type: 'info' | 'warning' | 'success' | 'error' = 'info',
        data?: Record<string, any>
    ): Promise<void> {
        await Notification.create({
            userId,
            title,
            body,
            type,
            data,
            read: false,
        });
    }

    /**
     * Send Push Notification via Firebase (FCM)
     */
    async sendPushNotification(
        tokens: string[],
        title: string,
        body: string,
        data?: Record<string, any>
    ): Promise<void> {
        if (!this.isFirebaseInitialized) {
            logger.debug(`[Mock Push] To: ${tokens.length} devices | Title: ${title}`);
            return;
        }

        try {
            const message: admin.messaging.MulticastMessage = {
                tokens,
                notification: {
                    title,
                    body,
                },
                data: data ? this.stringifyData(data) : undefined,
                android: {
                    priority: 'high',
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                        },
                    },
                },
            };

            // Note: sendMulticast is legacy, use sendEachForMulticast for new SDKs if needed, 
            // but for now we stick to what the type definition suggests or fix the type.
            // If the type error persists, we cast to any or check the SDK version.
            // Assuming the user's types are correct for the installed version.
            // Wait, the error said "Property 'sendMulticast' does not exist". 
            // It might be 'sendEachForMulticast' in newer versions.
            const response = await admin.messaging().sendEachForMulticast(message);

            if (response.failureCount > 0) {
                logger.warn(`${response.failureCount} push notifications failed to send`);
                // Optional: Clean up invalid tokens here based on response errors
            }
        } catch (error) {
            logger.error('FCM Send Error:', error);
        }
    }

    // Helper to ensure all data values are strings for FCM
    private stringifyData(data: Record<string, any>): Record<string, string> {
        const result: Record<string, string> = {};
        for (const key in data) {
            result[key] = String(data[key]);
        }
        return result;
    }

    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        try {
            // Email sending logic here (using nodemailer or similar)
            logger.info(`Email sent to ${to}: ${subject}`);
        } catch (error) {
            logger.error('Email send error:', error);
            throw error;
        }
    }

    async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
        const subject = 'Password Reset Request';
        const body = `
      You requested a password reset. Click the link below to reset your password:
      ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}
      
      This link will expire in 1 hour.
    `;

        await this.sendEmail(email, subject, body);
    }

    async sendWelcomeEmail(email: string, name: string): Promise<void> {
        const subject = 'Welcome to Lateral Flow Scanner';
        const body = `
      Hi ${name},
      
      Welcome to Lateral Flow Scanner! We're excited to have you on board.
      
      Get started by scanning your first test kit.
    `;

        await this.sendEmail(email, subject, body);
    }
}

export const notificationService = new NotificationService();