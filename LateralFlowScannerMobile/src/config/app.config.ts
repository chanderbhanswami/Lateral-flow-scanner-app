import { Platform } from 'react-native';
import { ENV } from './env';

export const APP_CONFIG = {
    name: 'Lateral Flow Scanner',
    version: '1.0.0',
    buildNumber: '100',

    api: {
        baseURL: ENV.API_BASE_URL,
        timeout: ENV.API_TIMEOUT,
    },

    camera: {
        targetResolution: {
            width: 4032,
            height: 3024,
        },
        targetFPS: 30,
        quality: 1.0,
        saveToGallery: false,
    },

    sensors: {
        updateInterval: 100, // ms
        accelerometer: {
            enabled: true,
            threshold: 2.5,
        },
        gyroscope: {
            enabled: true,
            threshold: 0.5,
        },
        lightSensor: {
            enabled: true,
            minLevel: 100,
        },
    },

    storage: {
        maxCacheSize: 100 * 1024 * 1024, // 100MB
        maxPendingUploads: 50,
    },

    features: {
        autoCapture: true,
        sensorDisplay: true,
        offlineMode: true,
        analytics: false,
    },

    platform: {
        isIOS: Platform.OS === 'ios',
        isAndroid: Platform.OS === 'android',
    },
};