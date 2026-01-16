/**
 * EXIF Data Utilities - JS Only
 * Works with file metadata
 */

// Inline types
interface ExifData {
    make?: string;
    model?: string;
    dateTime?: string;
    exposureTime?: number;
    fNumber?: number;
    iso?: number;
    focalLength?: number;
    flash?: boolean;
    orientation?: number;
    gpsLatitude?: number;
    gpsLongitude?: number;
    width?: number;
    height?: number;
}

/**
 * Format exposure time as fraction (JS)
 */
export function formatExposureTime(exposureSeconds: number): string {
    if (exposureSeconds >= 1) {
        return `${exposureSeconds.toFixed(1)}s`;
    }

    const denominator = Math.round(1 / exposureSeconds);
    return `1/${denominator}s`;
}

/**
 * Format focal length (JS)
 */
export function formatFocalLength(focalLength: number): string {
    return `${focalLength.toFixed(0)}mm`;
}

/**
 * Calculate 35mm equivalent focal length (JS)
 */
export function calculate35mmEquivalent(
    focalLength: number,
    sensorWidth: number = 6.17 // typical smartphone sensor
): number {
    // 35mm full frame sensor width is 36mm
    return (focalLength * 36) / sensorWidth;
}

/**
 * Parse GPS coordinates to decimal (JS)
 */
export function parseGpsToDecimal(
    degrees: number,
    minutes: number,
    seconds: number,
    direction: 'N' | 'S' | 'E' | 'W'
): number {
    let decimal = degrees + minutes / 60 + seconds / 3600;

    if (direction === 'S' || direction === 'W') {
        decimal = -decimal;
    }

    return decimal;
}

/**
 * Get orientation description (JS)
 */
export function getOrientationDescription(orientation: number): string {
    const descriptions: { [key: number]: string } = {
        1: 'Normal',
        2: 'Flipped Horizontal',
        3: 'Rotated 180°',
        4: 'Flipped Vertical',
        5: 'Rotated 90° CW, Flipped',
        6: 'Rotated 90° CW',
        7: 'Rotated 90° CCW, Flipped',
        8: 'Rotated 90° CCW'
    };

    return descriptions[orientation] || 'Unknown';
}

/**
 * Calculate rotation needed to display correctly (JS)
 */
export function getRotationForOrientation(orientation: number): number {
    const rotations: { [key: number]: number } = {
        1: 0,
        2: 0,
        3: 180,
        4: 180,
        5: 90,
        6: 90,
        7: 270,
        8: 270
    };

    return rotations[orientation] || 0;
}