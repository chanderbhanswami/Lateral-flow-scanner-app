import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Capture } from '../models/Capture.model';
import { redisService } from '../services/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '../utils/cache-keys';
import { logger } from '../utils/logger';

export const statisticsController = {
    async getUserStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user.userId;
            const cacheKey = CACHE_KEYS.STATISTICS(userId);

            // Try cache first
            const cached = await redisService.cacheGet(cacheKey);
            if (cached) {
                res.json({ success: true, data: cached });
                return;
            }

            // 1. Basic counts
            logger.info(`Getting stats for user: ${userId}`);

            // Explicit cast to ensure type matching
            const userObjectId = new mongoose.Types.ObjectId(userId);

            const totalCaptures = await Capture.countDocuments({ userId: userObjectId });
            const totalUploads = await Capture.countDocuments({ userId: userObjectId, status: 'uploaded' });

            logger.info(`Stats found: captures=${totalCaptures}, uploads=${totalUploads}`);

            // 2. Last activity
            const lastCapture = await Capture.findOne({ userId: userObjectId }).sort({ createdAt: -1 }).select('createdAt');
            const lastUploadDate = lastCapture ? lastCapture.createdAt : null;

            // 3. Storage Used (Sum of imageSize)
            const storageAggregation = await Capture.aggregate([
                { $match: { userId: userObjectId } },
                { $group: { _id: null, totalSize: { $sum: '$imageSize' } } }
            ]);
            const storageUsed = storageAggregation[0]?.totalSize || 0;

            // 4. Captures by Month (Last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const monthlyAggregation = await Capture.aggregate([
                { $match: { userId, createdAt: { $gte: sixMonthsAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            const capturesByMonth: Record<string, number> = {};
            monthlyAggregation.forEach(item => {
                capturesByMonth[item._id] = item.count;
            });

            const statistics = {
                totalCaptures,
                totalUploads,
                lastUploadDate,
                storageUsed,
                capturesByMonth
            };

            // Cache the result
            await redisService.cacheSet(cacheKey, statistics, CACHE_TTL.MEDIUM);

            res.json({
                success: true,
                data: statistics,
            });
        } catch (error) {
            next(error);
        }
    },

    async getGlobalStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const redis = redisService;
            const cached = await redis.cacheGet('statistics:global');

            if (cached) {
                res.json({ success: true, data: cached });
                return;
            }

            // Return empty if not available
            res.json({
                success: true,
                data: {
                    message: 'Statistics are being calculated',
                },
            });
        } catch (error) {
            next(error);
        }
    },
};