import { AccelerometerData } from '../../types';

export const calculateMagnitude = (data: AccelerometerData): number => {
    return Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
};

export const isDeviceShaking = (data: AccelerometerData, threshold: number = 2.5): boolean => {
    const magnitude = calculateMagnitude(data);
    return magnitude > threshold;
};

export const calculateTilt = (data: AccelerometerData): { pitch: number; roll: number } => {
    const pitch = Math.atan2(data.y, Math.sqrt(data.x * data.x + data.z * data.z)) * (180 / Math.PI);
    const roll = Math.atan2(data.x, Math.sqrt(data.y * data.y + data.z * data.z)) * (180 / Math.PI);

    return { pitch, roll };
};

export const isDeviceStable = (
    readings: AccelerometerData[],
    threshold: number = 0.1
): boolean => {
    if (readings.length < 5) return false;

    const recent = readings.slice(-5);
    const magnitudes = recent.map(calculateMagnitude);

    const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    const variance = magnitudes.reduce((sum, mag) => sum + Math.pow(mag - mean, 2), 0) / magnitudes.length;

    return variance < threshold;
};