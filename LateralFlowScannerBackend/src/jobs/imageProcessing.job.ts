import { Queue, Worker } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { Capture } from '../models/Capture.model';
import { logger } from '../utils/logger';

let imageQueue: Queue | null = null;
let imageWorker: Worker | null = null;

export const initImageProcessingWorker = () => {
    if (imageQueue) return; // Already initialized

    const connection = getRedisClient();

    imageQueue = new Queue('image-processing', { connection });

    imageWorker = new Worker(
        'image-processing',
        async (job) => {
            const { captureId } = job.data;

            try {
                logger.info(`Processing image for capture: ${captureId}`);

                const capture = await Capture.findOne({ captureId });
                if (!capture) {
                    throw new Error('Capture not found');
                }

                // Image is already stored in R2, just mark as processed
                // Future: Add Sharp.js for server-side thumbnail generation if needed

                // Update capture status
                capture.status = 'processed';
                await capture.save();

                logger.info(`Image processed successfully: ${captureId}`);
            } catch (error) {
                logger.error(`Image processing failed: ${captureId}`, error);
                throw error;
            }
        },
        {
            connection,
            concurrency: 5,
            // Optimization: Reduce Redis command usage (heartbeats)
            stalledInterval: 60000, // Check for stalled jobs every 60s (default 30s)
            lockDuration: 60000,    // Keep lock for 60s
        }
    );

    imageWorker.on('completed', (job) => {
        logger.info(`Job completed: ${job.id}`);
    });

    imageWorker.on('failed', (job, err) => {
        logger.error(`Job failed: ${job?.id}`, err);
    });

    logger.info('Image processing worker initialized');
};

export const addImageProcessingJob = async (captureId: string) => {
    if (!imageQueue) {
        throw new Error('Image processing queue not initialized');
    }
    await imageQueue.add('process-image', { captureId });
};

export const getImageQueue = () => imageQueue;
export const getImageWorker = () => imageWorker;