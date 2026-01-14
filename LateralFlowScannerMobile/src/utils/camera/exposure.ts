import { CameraDevice } from 'react-native-vision-camera';

export const calculateOptimalExposure = (
    device: CameraDevice,
    currentBrightness: number
): number => {
    // Calculate optimal exposure based on current brightness
    const targetBrightness = 0.5; // 50% brightness
    const difference = targetBrightness - currentBrightness;

    // Clamp to device capabilities
    const minExposure = device.minExposure || -2;
    const maxExposure = device.maxExposure || 2;

    let exposure = difference * 2; // Scale factor
    exposure = Math.max(minExposure, Math.min(maxExposure, exposure));

    return exposure;
};

export const calculateExposureCompensation = (
    histogram: number[],
    targetMean: number = 128
): number => {
    // Calculate mean brightness from histogram
    let sum = 0;
    let count = 0;

    for (let i = 0; i < histogram.length; i++) {
        sum += histogram[i] * i;
        count += histogram[i];
    }

    const mean = count > 0 ? sum / count : 0;
    const compensation = (targetMean - mean) / 128;

    return Math.max(-2, Math.min(2, compensation));
};

export const isExposureLocked = (exposure: number, targetExposure: number): boolean => {
    return Math.abs(exposure - targetExposure) < 0.1;
};