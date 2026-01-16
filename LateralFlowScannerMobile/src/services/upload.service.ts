import { CaptureData, UploadResponse } from '../types';
import { captureApi } from '../api/capture.api';
import { storageService } from './storage.service';
import { logger } from '../utils/logger';
import { readFile } from '../utils/filesystem';
import { retry } from '../utils/retry';

class UploadService {
    async uploadCapture(captureData: CaptureData, imageUri: string): Promise<UploadResponse> {
        try {
            const response = await this._uploadToBackend(captureData, imageUri);

            // Save to local storage for offline support (success case)
            await storageService.saveCaptureLocally(captureData);

            return response;
        } catch (error) {
            logger.error('Upload error', error);

            // Save to local storage for retry
            await storageService.savePendingCapture(captureData, imageUri);

            throw error;
        }
    }

    private async _uploadToBackend(captureData: CaptureData, imageUri: string): Promise<UploadResponse> {
        // Read image as base64 using filesystem utility
        const RNFS = require('react-native-fs').default;
        const imageBase64 = await RNFS.readFile(imageUri, 'base64');

        // Upload to backend with retry
        return await retry(
            () => captureApi.upload({
                captureData,
                imageBase64,
            }),
            {
                retries: 2,
                delay: 1000,
                onRetry: (error, attempt) => {
                    logger.warn(`Upload attempt ${attempt} failed, retrying...`, { error: error.message });
                }
            }
        );
    }

    async retryPendingUploads(): Promise<void> {
        const pending = await storageService.getPendingCaptures();

        if (pending.length === 0) return;

        logger.info(`Retrying ${pending.length} pending uploads...`);

        for (const item of pending) {
            try {
                logger.debug(`Retrying capture ${item.captureData.id}`);
                await this._uploadToBackend(item.captureData, item.imageUri);

                // If successful, remove from pending
                await storageService.removePendingCapture(item.captureData.id);
                logger.info(`Retry successful for capture`, { id: item.captureData.id });
            } catch (error) {
                logger.error(`Retry failed for capture ${item.captureData.id}`, error);
                // Leave in pending queue for next retry
            }
        }
    }
}

export const uploadService = new UploadService();