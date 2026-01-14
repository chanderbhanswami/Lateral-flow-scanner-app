import { Queue, Worker } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { Capture } from '../models/Capture.model';
import { r2Service } from '../services/r2.service';
import { logger } from '../utils/logger';

const cleanupQueue = new Queue('cleanup', {
    connection: getRedisClient(),
});

// Schedule cleanup job daily
export const scheduleCleanup = async () => {
    await cleanupQueue.add(
        'daily-cleanup',
        {},
        {
            repeat: {
                pattern: '0 0 * * *', // Daily at midnight
            },
        }
    );
};

const cleanupWorker = new Worker(
    'cleanup',
    async (job) => {
        try {
            logger.info('Starting cleanup job');

            // Delete old failed captures (older than 7 days)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const failedCaptures = await Capture.find({
                status: 'failed',
                createdAt: { $lt: sevenDaysAgo },
            });

            for (const capture of failedCaptures) {
                try {
                    await r2Service.deleteImage(capture.imageKey);
                    await capture.deleteOne();
                } catch (error) {
                    logger.error(`Failed to delete capture: ${capture.captureId}`, error);
                }
            }

            logger.info(`Cleanup completed. Deleted ${failedCaptures.length} failed captures`);
        } catch (error) {
            logger.error('Cleanup job failed', error);
            throw error;
        }
    },
    {
        connection: getRedisClient(),
    }
);

export { cleanupQueue, cleanupWorker };