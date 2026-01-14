import { useState, useCallback } from 'react';
import { CaptureMetadata, CameraMetadata, AllSensorData } from '../types';
import { metadataService } from '../services/metadata.service';

export const useMetadata = () => {
    const [metadata, setMetadata] = useState<CaptureMetadata | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);

    const extractMetadata = useCallback(
        async (
            captureId: string,
            userId: string,
            imageUri: string,
            cameraMetadata: CameraMetadata,
            sensorData: AllSensorData,
            analysisData: any
        ) => {
            setIsExtracting(true);
            try {
                const exifData = await metadataService.extractExifData(imageUri);
                const deviceInfo = await metadataService.getDeviceInfo();

                const captureMetadata: CaptureMetadata = {
                    captureId,
                    userId,
                    timestamp: new Date().toISOString(),
                    camera: cameraMetadata,
                    sensors: sensorData,
                    analysis: analysisData,
                    device: deviceInfo,
                    environment: {
                        lightLevel: sensorData.lightSensor?.illuminance || 0,
                        lightCondition: metadataService.determineLightCondition(
                            sensorData.lightSensor?.illuminance || 0
                        ),
                    },
                    processing: {
                        processingTime: 0,
                        frameProcessorVersion: '1.0.0',
                        algorithmVersion: '1.0.0',
                        calibrationUsed: false,
                        compressionApplied: false,
                        filtersApplied: [],
                    },
                };

                setMetadata(captureMetadata);
                return captureMetadata;
            } catch (error) {
                console.error('Metadata extraction error:', error);
                throw error;
            } finally {
                setIsExtracting(false);
            }
        },
        []
    );

    const resetMetadata = useCallback(() => {
        setMetadata(null);
    }, []);

    return {
        metadata,
        isExtracting,
        extractMetadata,
        resetMetadata,
    };
};