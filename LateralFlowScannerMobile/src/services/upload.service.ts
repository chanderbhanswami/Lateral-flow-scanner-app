import RNFS from 'react-native-fs';
import { CaptureData, UploadResponse } from '../types';
import { captureApi } from '../api/capture.api';
import { storageService } from './storage.service';

class UploadService {
    async uploadCapture(captureData: CaptureData, imageUri: string): Promise<UploadResponse> {
        try {
            const response = await this._uploadToBackend(captureData, imageUri);

            // Save to local storage for offline support (success case)
            await storageService.saveCaptureLocally(captureData);

            return response;
        } catch (error) {
            console.error('Upload error:', error);

            // Save to local storage for retry
            await storageService.savePendingCapture(captureData, imageUri);

            throw error;
        }
    }

    private async _uploadToBackend(captureData: CaptureData, imageUri: string): Promise<UploadResponse> {
        // Read image as base64
        const imageBase64 = await RNFS.readFile(imageUri, 'base64');

        // Upload to backend
        return await captureApi.upload({
            captureData,
            imageBase64,
        });
    }

    async retryPendingUploads(): Promise<void> {
        const pending = await storageService.getPendingCaptures();

        if (pending.length === 0) return;

        console.log(`[UploadService] Retrying ${pending.length} pending uploads...`);

        for (const item of pending) {
            try {
                console.log(`[UploadService] Retrying capture ${item.captureData.id}`);
                await this._uploadToBackend(item.captureData, item.imageUri);

                // If successful, remove from pending
                await storageService.removePendingCapture(item.captureData.id);
                console.log(`[UploadService] Retry successful for ${item.captureData.id}`);
            } catch (error) {
                console.error(`[UploadService] Retry failed for ${item.captureData.id}:`, error);
                // Leave in pending queue for next retry
            }
        }
    }
}

export const uploadService = new UploadService();