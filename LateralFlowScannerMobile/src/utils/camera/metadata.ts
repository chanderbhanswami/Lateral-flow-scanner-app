/**
 * Camera Metadata Utilities
 * Extracts and processes camera device metadata
 * Note: These are JS-only as they work with device objects, not frame data
 */

// Inline types
interface CameraCapabilities {
    supportsFlash: boolean;
    supportsAutoFocus: boolean;
    supportsExposureControl: boolean;
    supportsZoom: boolean;
    maxZoom: number;
    minZoom: number;
    supportedFps: number[];
    hasUltraWide: boolean;
    hasTelephoto: boolean;
}

/**
 * Extract camera capabilities from device (JS context)
 */
export function extractCameraCapabilities(device: any): CameraCapabilities {
    if (!device) {
        return {
            supportsFlash: false,
            supportsAutoFocus: false,
            supportsExposureControl: false,
            supportsZoom: false,
            maxZoom: 1,
            minZoom: 1,
            supportedFps: [30],
            hasUltraWide: false,
            hasTelephoto: false
        };
    }

    return {
        supportsFlash: device.hasFlash ?? false,
        supportsAutoFocus: device.supportsFocus ?? true,
        supportsExposureControl: true, // Most devices support this
        supportsZoom: device.maxZoom > 1,
        maxZoom: device.maxZoom ?? 1,
        minZoom: device.minZoom ?? 1,
        supportedFps: device.formats?.map((f: any) => f.maxFps)?.filter((v: any, i: any, a: any) => a.indexOf(v) === i) ?? [30],
        hasUltraWide: device.physicalDevices?.includes('ultra-wide-angle-camera') ?? false,
        hasTelephoto: device.physicalDevices?.includes('telephoto-camera') ?? false
    };
}

/**
 * Get optimal format for quality capture (JS context)
 */
export function selectOptimalFormat(device: any): any {
    if (!device || !device.formats || device.formats.length === 0) {
        return null;
    }

    // Sort by resolution (highest first) then by fps
    const sorted = [...device.formats].sort((a, b) => {
        const resA = a.photoWidth * a.photoHeight;
        const resB = b.photoWidth * b.photoHeight;
        if (resA !== resB) return resB - resA;
        return b.maxFps - a.maxFps;
    });

    // Return highest resolution with at least 30fps
    return sorted.find((f) => f.maxFps >= 30) || sorted[0];
}

/**
 * Calculate effective focal length (JS context)
 */
export function calculateEffectiveFocalLength(
    zoom: number,
    baseFocalLength: number = 26 // typical smartphone wide lens
): number {
    return baseFocalLength * zoom;
}