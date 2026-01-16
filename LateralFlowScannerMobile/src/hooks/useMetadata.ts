import { useState, useCallback } from 'react';
import { CaptureMetadata, CameraMetadata, AllSensorData, ExifData } from '../types';
import { metadataService } from '../services/metadata.service';
import { logger } from '../utils/logger';
import { formatExposureTime, formatFocalLength, getOrientationDescription } from '../utils/image/exif';

export const useMetadata = () => {
    const [metadata, setMetadata] = useState<CaptureMetadata | null>(null);
    const [exifData, setExifData] = useState<ExifData | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Extract just EXIF data from an image
    const extractExif = useCallback(async (imageUri: string) => {
        setIsLoading(true);
        try {
            const data = await metadataService.extractExifData(imageUri);
            setExifData(data);
            return data;
        } catch (error) {
            logger.error('EXIF extraction error', error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Format EXIF for display
    const formatMetadata = useCallback((data: ExifData | null) => {
        if (!data) return null;

        // Cast to any to access all possible EXIF properties
        const exif = data as any;

        return {
            exposureTime: formatExposureTime(exif.exposureTime || 0),
            focalLength: formatFocalLength(exif.focalLength || 0),
            iso: exif.iso?.toString() || exif.isoSpeedRatings?.toString() || 'Unknown',
            aperture: exif.aperture ? `f/${exif.aperture.toFixed(1)}` : exif.fNumber ? `f/${exif.fNumber.toFixed(1)}` : 'Unknown',
            orientation: getOrientationDescription(exif.orientation || 1),
            make: exif.make || 'Unknown',
            model: exif.model || 'Unknown',
            dateTime: exif.dateTime || 'Unknown',
            width: exif.width || exif.imageWidth || 0,
            height: exif.height || exif.imageHeight || 0,
        };
    }, []);

    // Extract full capture metadata (for complete capture flow)
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
                const exif = await metadataService.extractExifData(imageUri);
                setExifData(exif);

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
                logger.error('Metadata extraction error', error);
                throw error;
            } finally {
                setIsExtracting(false);
            }
        },
        []
    );

    const resetMetadata = useCallback(() => {
        setMetadata(null);
        setExifData(null);
    }, []);

    return {
        metadata,
        exifData,
        isExtracting,
        isLoading,
        extractExif,
        extractMetadata,
        formatMetadata,
        resetMetadata,
    };
};