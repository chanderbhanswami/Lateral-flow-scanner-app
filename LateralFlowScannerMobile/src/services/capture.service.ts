import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { CaptureData } from '@lateralflowscanner/shared';
import { metadataService } from './metadata.service';
import { useAuthStore } from '../store/authStore';
import RNFS from 'react-native-fs';

class CaptureService {
    async createCaptureData(
        imageUri: string,
        cameraMetadata: any,
        sensorData: any,
        analysisData: any,
        concentrationBatchId?: string
    ): Promise<CaptureData> {
        const captureId = uuidv4();
        const userId = useAuthStore.getState().user?.id || '';
        const timestamp = new Date().toISOString();

        // Get image info
        const imageInfo = await RNFS.stat(imageUri);

        const captureData: CaptureData = {
            id: captureId,
            userId,
            timestamp,
            imageUrl: '', // Will be set after upload
            imageKey: `captures/${userId}/${captureId}.jpg`,
            imagePath: imageUri,
            imageSize: imageInfo.size,
            imageWidth: 0, // Will be extracted from EXIF
            imageHeight: 0, // Will be extracted from EXIF
            concentration: '',
            concentrationBatchId: concentrationBatchId || undefined,
            cameraMetadata,
            exifData: await metadataService.extractExifData(imageUri),
            sensorData,
            analysisData,
            deviceInfo: await metadataService.getDeviceInfo(),
            captureMode: 'auto',
            status: 'pending',
        };

        return captureData;
    }

    validateCaptureData(data: CaptureData): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!data.id) errors.push('Missing capture ID');
        if (!data.userId) errors.push('Missing user ID');
        if (!data.imagePath) errors.push('Missing image path');
        if (!data.cameraMetadata) errors.push('Missing camera metadata');
        if (!data.sensorData) errors.push('Missing sensor data');
        if (!data.analysisData) errors.push('Missing analysis data');

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}

export const captureService = new CaptureService();