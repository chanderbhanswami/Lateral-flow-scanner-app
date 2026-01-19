import { Queue, Worker } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { Capture } from '../models/Capture.model';
import { User } from '../models/User.model';
import { logger } from '../utils/logger';


let statisticsQueue: Queue | null = null;
let statisticsWorker: Worker | null = null;

export const initStatisticsWorker = () => {
    if (statisticsQueue) return;

    const connection = getRedisClient();

    statisticsQueue = new Queue('statistics', {
        connection,
        defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: 1000
        }
    });

    statisticsWorker = new Worker(
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
            connection,
            // Optimization for checking stalled jobs less frequently to save Redis commands
            stalledInterval: 60000, // Check every 60s instead of default 30s
            lockDuration: 30000,
        }
    );

    logger.info('Statistics worker initialized');
};

export const scheduleStatisticsUpdate = async () => {
    if (!statisticsQueue) {
        // If not initialized, try to init (or throw error, but safe to init akin to other jobs)
        initStatisticsWorker();
    }

    if (statisticsQueue) {
        await statisticsQueue.add(
            'update-statistics',
            {},
            {
                repeat: {
                    pattern: '0 * * * *', // Every hour
                },
            }
        );
    }
};

export const getStatisticsQueue = () => statisticsQueue;
export const getStatisticsWorker = () => statisticsWorker;