import { initImageProcessingWorker, getImageWorker } from '../jobs/imageProcessing.job';
import { logger } from '../utils/logger';

export const initWorkers = async () => {
    try {
        logger.info('Initializing background workers...');

        // Initialize image processing worker (requires Redis to be connected first)
        initImageProcessingWorker();

        // Add other workers here if they exist (e.g. cleanup, statistics)
        // initCleanupWorker();
        // initStatisticsWorker();

        logger.info('Background workers initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize workers:', error);
        throw error;
    }
};

export const shutdownWorkers = async () => {
    try {
        logger.info('Shutting down workers...');
        const imageWorker = getImageWorker();
        if (imageWorker) {
            await imageWorker.close();
        }
        // await cleanupWorker?.close();
        // await statisticsWorker?.close();
        logger.info('Workers shut down successfully');
    } catch (error) {
        logger.error('Error shutting down workers:', error);
    }
};
