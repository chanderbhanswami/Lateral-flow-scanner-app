import { initImageProcessingWorker, getImageWorker } from '../jobs/imageProcessing.job';
import { initStatisticsWorker, scheduleStatisticsUpdate, getStatisticsWorker } from '../jobs/statistics.job';
import { initCleanupWorker, scheduleCleanup, getCleanupWorker } from '../jobs/cleanup.job';
import { logger } from '../utils/logger';

export const initWorkers = async () => {
    try {
        logger.info('Initializing background workers...');

        // Initialize image processing worker
        initImageProcessingWorker();

        // Initialize and schedule statistics job
        initStatisticsWorker();
        await scheduleStatisticsUpdate();

        // Initialize and schedule cleanup job
        initCleanupWorker();
        await scheduleCleanup();

        logger.info('Background workers initialized and scheduled successfully');
    } catch (error) {
        logger.error('Failed to initialize workers:', error);
        throw error;
    }
};

export const shutdownWorkers = async () => {
    try {
        logger.info('Shutting down workers...');

        const imageWorker = getImageWorker();
        if (imageWorker) await imageWorker.close();

        const statisticsWorker = getStatisticsWorker();
        if (statisticsWorker) await statisticsWorker.close();

        const cleanupWorker = getCleanupWorker();
        if (cleanupWorker) await cleanupWorker.close();

        logger.info('Workers shut down successfully');
    } catch (error) {
        logger.error('Error shutting down workers:', error);
    }
};
