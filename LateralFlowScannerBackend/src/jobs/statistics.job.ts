import { Queue, Worker } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { Capture } from '../models/Capture.model';
import { User } from '../models/User.model';
import { logger } from '../utils/logger';

const statisticsQueue = new Queue('statistics', {
    connection: getRedisClient(),
});

export const scheduleStatisticsUpdate = async () => {
    await statisticsQueue.add(
        'update-statistics',
        {},
        {
            repeat: {
                pattern: '0 * * * *', // Every hour
            },
        }
    );
};

const statisticsWorker = new Worker(
    'statistics',
    async (job) => {
        try {
            logger.info('Updating statistics');

            // Calculate various statistics
            const totalUsers = await User.countDocuments();
            const totalCaptures = await Capture.countDocuments();
            const capturesLast24h = await Capture.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            });

            const statistics = {
                totalUsers,
                totalCaptures,
                capturesLast24h,
                timestamp: new Date(),
            };

            // Store in Redis for quick access
            const redis = getRedisClient();
            await redis.set('statistics:global', JSON.stringify(statistics), 'EX', 3600);

            logger.info('Statistics updated', statistics);
        } catch (error) {
            logger.error('Statistics update failed:', error);
            throw error;
        }
    },
    {
        connection: getRedisClient(),
    }
);

export { statisticsQueue, statisticsWorker };