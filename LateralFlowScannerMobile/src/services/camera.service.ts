import { Camera, CameraDevice } from 'react-native-vision-camera';
import { CameraMetadata } from '../types';

class CameraService {
    async checkPermission(): Promise<boolean> {
        const status = await Camera.getCameraPermissionStatus();
        return status === 'granted';
    }

    async requestPermission(): Promise<boolean> {
        const status = await Camera.requestCameraPermission();
        return status === 'granted';
    }

    async checkMicrophonePermission(): Promise<boolean> {
        const status = await Camera.getMicrophonePermissionStatus();
        return status === 'granted';
    }

    extractCameraMetadata(device: CameraDevice): CameraMetadata {
        const now = new Date().toISOString();

        return {
            make: 'Unknown',
            model: device.name || 'Unknown',
            lensModel: device.name || 'Unknown',
            focalLength: 0,
            focalLengthIn35mm: 0,
            aperture: 0,
            iso: 0,
            exposureTime: 0,
            whiteBalance: 0,
            flash: false,
            digitalZoom: 1.0,
            opticalZoom: 1.0,
            timestamp: now,
        };
    }

    async getCameraCapabilities(device: CameraDevice) {
        return {
            hasFlash: device.hasFlash,
            hasTorch: device.hasTorch,
            supportsFocus: device.supportsFocus,
            supportsRawCapture: false,
            supportsDepthCapture: false,
            minZoom: device.minZoom,
            maxZoom: device.maxZoom,
            formats: device.formats,
        };
    }
}

export const cameraService = new CameraService();