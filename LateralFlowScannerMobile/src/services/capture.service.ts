import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { CaptureData } from '@lateralflowscanner/shared';
import { metadataService } from './metadata.service';
import { useAuthStore } from '../store/authStore';
import { NativeModules } from 'react-native';

// Import utilities
import { getFileInfo, deleteFile, DIRECTORIES } from '../utils/filesystem';
import { logger } from '../utils/logger';
import { generateUUID } from '../utils/helpers';

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

        // Get image info using utility
        const imageInfo = await getFileInfo(imageUri);

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

    async cropCapture(
        imageUri: string,
        corners: Array<{ x: number; y: number }> | null,
        imageWidth: number,
        imageHeight: number
    ): Promise<string> {
        try {
            const { OpenCVModule } = NativeModules;
            if (!OpenCVModule || !OpenCVModule.perspectiveCorrection) {
                console.warn('OpenCVModule.perspectiveCorrection not available');
                return imageUri;
            }

            // 1. Determine the 4 corners to crop
            let targetCorners: Array<{ x: number; y: number }> = [];

            const FRAME_W = 640;
            const FRAME_H = 480;
            const scaleX = imageWidth / FRAME_W;
            const scaleY = imageHeight / FRAME_H;

            if (corners && corners.length === 4) {
                // Case A: Detected Green Border (Scale from Frame 640x480 to Image)
                targetCorners = corners.map(c => ({
                    x: c.x * scaleX,
                    y: c.y * scaleY
                }));
            } else {
                // Case B: Static Red Guide
                // Calculate a centered crop based on Cassette Aspect Ratio (1:3.5)
                // Assumes CASSETTE_WIDTH is ~60% of Width

                const cropW = imageWidth * 0.6;
                const cropH = cropW * 3.5; // Aspect 1:3.5

                // Ensure it fits within image bounds
                const finalW = Math.min(cropW, imageWidth);
                const finalH = Math.min(cropH, imageHeight);

                const x = (imageWidth - finalW) / 2;
                const y = (imageHeight - finalH) / 2;

                targetCorners = [
                    { x: x, y: y },                 // Top-Left
                    { x: x + finalW, y: y },        // Top-Right
                    { x: x + finalW, y: y + finalH }, // Bottom-Right
                    { x: x, y: y + finalH }         // Bottom-Left
                ];
            }

            // 2. Prepare File Path (Strip file:// prefix for Android native file access if needed)
            // React Native 'imageUri' usually starts with file://
            const filePath = imageUri.replace('file://', '');

            // 3. Call Native Module for Perspective Correction / Cropping logic
            // Checks if 'cropImage' exists (the new method we just added)
            // We fallback to perspectiveCorrection (legacy) if cropImage is missing, but we just added it.

            let croppedPath = imageUri;

            if (OpenCVModule.cropImage) {
                croppedPath = await OpenCVModule.cropImage(filePath, targetCorners);
            } else if (OpenCVModule.perspectiveCorrection) {
                // Fallback to legacy Base64 method - requires RNFS for file I/O
                logger.warn('Using legacy Base64 crop - update native module!');
                const RNFS = require('react-native-fs').default;
                const base64Image = await RNFS.readFile(imageUri, 'base64');
                const resultBase64 = await OpenCVModule.perspectiveCorrection(base64Image, targetCorners);
                if (resultBase64) {
                    const newPath = imageUri.replace('.jpg', '_cropped.jpg');
                    await RNFS.writeFile(newPath, resultBase64, 'base64');
                    croppedPath = newPath;
                }
            }

            logger.info('Capture cropped successfully', { path: croppedPath });
            return typeof croppedPath === 'string' ? `file://${croppedPath}` : imageUri;

        } catch (e) {
            logger.error('Crop failed, using original', e);
            return imageUri;
        }
    }
}

export const captureService = new CaptureService();