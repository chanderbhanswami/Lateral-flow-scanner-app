import { Request, Response, NextFunction } from 'express';
import { Capture } from '../models/Capture.model';
import { redisService } from '../services/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '../utils/cache-keys';

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

            // Calculate statistics
            const totalCaptures = await Capture.countDocuments({ userId });
            const autoCaptures = await Capture.countDocuments({ userId, captureMode: 'auto' });
            const manualCaptures = await Capture.countDocuments({ userId, captureMode: 'manual' });

            const avgQuality = await Capture.aggregate([
                { $match: { userId } },
                {
                    $group: {
                        _id: null,
                        avgQuality: { $avg: '$analysisData.qualityScore' },
                    },
                },
            ]);

            const statistics = {
                totalCaptures,
                autoCaptures,
                manualCaptures,
                averageQuality: avgQuality[0]?.avgQuality || 0,
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