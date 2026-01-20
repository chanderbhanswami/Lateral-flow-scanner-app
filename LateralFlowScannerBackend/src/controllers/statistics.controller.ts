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
                { $match: { userId: userObjectId, createdAt: { $gte: sixMonthsAgo } } }, // Fixed: Use ObjectId
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
            const cacheKey = 'statistics:global';
            const cached = await redis.cacheGet(cacheKey);

            if (cached) {
                res.json({ success: true, data: cached });
                return;
            }

            // Calculate if not in cache (Heavy operation, but necessary if cache expires)
            logger.info('Calculating Global Statistics (Cache Miss)');

            // 1. Total Captures & Storage
            const globalAgg = await Capture.aggregate([
                {
                    $group: {
                        _id: null,
                        totalCaptures: { $sum: 1 },
                        totalStorage: { $sum: '$imageSize' },
                        uniqueUsers: { $addToSet: '$userId' }
                    }
                }
            ]);

            const totalCaptures = globalAgg[0]?.totalCaptures || 0;
            const totalStorageUsed = globalAgg[0]?.totalStorage || 0;
            const totalUsers = globalAgg[0]?.uniqueUsers?.length || 0;

            // 2. Active Users (7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const activeUsersAgg = await Capture.distinct('userId', {
                createdAt: { $gte: sevenDaysAgo }
            });
            const activeUsers7Days = activeUsersAgg.length;

            const globalStats = {
                totalUsers, // In a real app, query User model, but this proxies active uploaders
                totalCaptures,
                activeUsers7Days,
                totalStorageUsed
            };

            // Cache for longer (e.g. 1 hour)
            await redis.cacheSet(cacheKey, globalStats, 3600);

            res.json({
                success: true,
                data: globalStats,
            });
        } catch (error) {
            next(error);
        }
    },
};