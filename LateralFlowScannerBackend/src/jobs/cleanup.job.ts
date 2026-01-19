import { Queue, Worker } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { Capture } from '../models/Capture.model';
import { r2Service } from '../services/r2.service';
import { logger } from '../utils/logger';


let cleanupQueue: Queue | null = null;
let cleanupWorker: Worker | null = null;

export const initCleanupWorker = () => {
    if (cleanupQueue) return;

    const connection = getRedisClient();

    cleanupQueue = new Queue('cleanup', { connection });

    cleanupWorker = new Worker(
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
            connection,
            // Optimization for low usage
            stalledInterval: 60000 * 5, // Check stalled jobs every 5 minutes (cleanup is rare)
            lockDuration: 60000,
        }
    );

    logger.info('Cleanup worker initialized');
};

// Schedule cleanup job daily
export const scheduleCleanup = async () => {
    if (!cleanupQueue) initCleanupWorker();

    if (cleanupQueue) {
        await cleanupQueue.add(
            'daily-cleanup',
            {},
            {
                repeat: {
                    pattern: '0 0 * * *', // Daily at midnight
                },
            }
        );
    }
};

export const getCleanupQueue = () => cleanupQueue;
export const getCleanupWorker = () => cleanupWorker;