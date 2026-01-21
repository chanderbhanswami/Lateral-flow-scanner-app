import { NativeModules } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { CaptureMetadata, DeviceInfo as DeviceInfoType, ExifData } from '../types';

const { ExifModule } = NativeModules;

class MetadataService {
    async extractExifData(imageUri: string): Promise<ExifData> {
        if (ExifModule && ExifModule.extractExifData) {
            try {
                const rawExif = await ExifModule.extractExifData(imageUri);
                // Convert string values to numbers where necessary
                return {
                    ...rawExif,
                    subjectDistance: rawExif.subjectDistance ? parseFloat(rawExif.subjectDistance) : 0,
                    // Ensure other numeric fields are handled if the native module returns strings
                } as ExifData;
            } catch (error) {
                console.error('EXIF extraction error:', error);
            }
        }

        // Fallback default EXIF data
        const now = new Date().toISOString();
        return {
            make: 'Unknown',
            model: 'Unknown',
            orientation: 1,
            xResolution: 72,
            yResolution: 72,
            resolutionUnit: 2,
            software: 'Lateral Flow Scanner',
            dateTime: now,
            yCbCrPositioning: 1,
            exifOffset: 0,
            gpsInfo: null,
            exposureTime: 0,
            fNumber: 0,
            exposureProgram: 0,
            isoSpeedRatings: 0,
            exifVersion: '0230',
            dateTimeOriginal: now,
            dateTimeDigitized: now,
            componentConfiguration: '1,2,3,0',
            shutterSpeedValue: 0,
            apertureValue: 0,
            brightnessValue: 0,
            exposureBiasValue: 0,
            maxApertureValue: 0,
            meteringMode: 0,
            flash: 0,
            focalLength: 0,
            subjectArea: [],
            flashpixVersion: '0100',
            colorSpace: 1,
            pixelXDimension: 0,
            pixelYDimension: 0,
            sensingMethod: 0,
            sceneType: 0,
            exposureMode: 0,
            whiteBalance: 0,
            focalLengthIn35mmFilm: 0,
            sceneCaptureType: 0,
            lensSpecification: [],
            lensMake: 'Unknown',
            lensModel: 'Unknown',
            subjectDistance: 0,
        };
    }

    async getDeviceInfo(): Promise<DeviceInfoType> {
        return {
            deviceId: await DeviceInfo.getUniqueId(),
            brand: DeviceInfo.getBrand(),
            model: DeviceInfo.getModel(),
            systemName: DeviceInfo.getSystemName(),
            systemVersion: DeviceInfo.getSystemVersion(),
            appVersion: DeviceInfo.getVersion(),
            buildNumber: DeviceInfo.getBuildNumber(),
            isTablet: DeviceInfo.isTablet(),
            hasNotch: DeviceInfo.hasNotch(),
        };
    }

    async createCaptureMetadata(
        captureId: string,
        userId: string,
        cameraMetadata: any,
        sensorData: any,
        analysisData: any
    ): Promise<CaptureMetadata> {
        const deviceInfo = await this.getDeviceInfo();
        const timestamp = new Date().toISOString();

        return {
            captureId,
            userId,
            timestamp,
            camera: cameraMetadata,
            sensors: sensorData,
            analysis: analysisData,
            device: deviceInfo,
            environment: {
                lightLevel: sensorData?.lightSensor?.illuminance || 0,
                lightCondition: this.determineLightCondition(sensorData?.lightSensor?.illuminance || 0),
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
    }

    determineLightCondition(illuminance: number): 'bright' | 'normal' | 'dim' | 'dark' {
        if (illuminance > 10000) return 'bright';
        if (illuminance > 1000) return 'normal';
        if (illuminance > 100) return 'dim';
        return 'dark';
    }
}

export const metadataService = new MetadataService();