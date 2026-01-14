import { Dimensions, Platform } from 'react-native';

/**
 * Get device dimensions
 */
export const getDeviceDimensions = () => {
    const { width, height } = Dimensions.get('window');
    return {
        width,
        height,
        isLandscape: width > height,
    };
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Debounce function
 */
export const debounce = <F extends (...args: any[]) => any>(
    func: F,
    waitFor: number
) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<F>): void => {
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => func(...args), waitFor);
    };
};

/**
 * Throttle function
 */
export const throttle = <F extends (...args: any[]) => any>(
    func: F,
    limit: number
) => {
    let inThrottle: boolean;
    return (...args: Parameters<F>): void => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

/**
 * Generate UUID
 */
export const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * Check if device is iOS
 */
export const isIOS = Platform.OS === 'ios';

/**
 * Check if device is Android
 */
export const isAndroid = Platform.OS === 'android';

/**
 * Get platform-specific value
 */
export const platformSelect = <T>(ios: T, android: T): T => {
    return Platform.select({ ios, android }) as T;
};

/**
 * Clamp number between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};

/**
 * Linear interpolation
 */
export const lerp = (start: number, end: number, t: number): number => {
    return start + (end - start) * t;
};

/**
 * Map value from one range to another
 */
export const mapRange = (
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
): number => {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};
