import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.model';
import { Notification } from '../models/Notification.model';
import { ApiError } from '../utils/error';
import { logger } from '../utils/logger';

export const notificationController = {
    // Register FCM Token
    async registerToken(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const { token } = req.body;

            if (!token) {
                throw new ApiError(400, 'FCM Token is required');
            }

            // Add token to user if not exists
            await User.findByIdAndUpdate(userId, {
                $addToSet: { fcmTokens: token }
            });

            logger.info(`FCM Token registered for user ${userId}`);

            res.json({
                success: true,
                message: 'Token registered successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    // Unregister FCM Token (Logout)
    async unregisterToken(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const { token } = req.body;

            if (!token) {
                throw new ApiError(400, 'FCM Token is required');
            }

            await User.findByIdAndUpdate(userId, {
                $pull: { fcmTokens: token }
            });

            logger.info(`FCM Token unregistered for user ${userId}`);

            res.json({
                success: true,
                message: 'Token unregistered successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    // Get Notification History
    async listNotifications(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.pageSize as string) || 20;
            const skip = (page - 1) * pageSize;

            const [notifications, total] = await Promise.all([
                Notification.find({ userId })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(pageSize),
                Notification.countDocuments({ userId })
            ]);

            const unreadCount = await Notification.countDocuments({ userId, read: false });

            res.json({
                success: true,
                data: {
                    items: notifications,
                    total,
                    unreadCount,
                    page,
                    pageSize,
                    hasMore: skip + notifications.length < total
                }
            });
        } catch (error) {
            next(error);
        }
    },

    // Mark as Read
    async markRead(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const { id } = req.params;

            const notification = await Notification.findOne({ _id: id, userId });
            if (!notification) {
                throw new ApiError(404, 'Notification not found');
            }

            notification.read = true;
            await notification.save();

            res.json({
                success: true,
                data: notification
            });
        } catch (error) {
            next(error);
        }
    },

    // Mark All as Read
    async markAllRead(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;

            await Notification.updateMany(
                { userId, read: false },
                { $set: { read: true } }
            );

            res.json({
                success: true,
                message: 'All notifications marked as read'
            });
        } catch (error) {
            next(error);
        }
    }
};
