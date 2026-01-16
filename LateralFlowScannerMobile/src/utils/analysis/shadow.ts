/**
 * Shadow Detection Utilities - Worklet Compatible
 */

// Inline types
interface ShadowAnalysis {
    hasShadow: boolean;
    shadowCoverage: number;
    shadowIntensity: number;
    shadowLocations: Array<{ x: number; y: number; size: number }>;
}

// Inline thresholds
const SHADOW_THRESHOLDS = {
    BRIGHTNESS: 60,
    COVERAGE: 0.1,
    BLOCK_RATIO: 0.3,
    BLOCK_SIZE: 32
};

/**
 * Quick shadow detection from histogram (Worklet-safe, fast)
 */
export function detectShadowsWorklet(
    brightnessHist: number[],
    pixelCount: number
): { hasShadow: boolean; shadowCoverage: number } {
    'worklet';

    // Count pixels in shadow range (0-60)
    let shadowPixels = 0;
    for (let i = 0; i < SHADOW_THRESHOLDS.BRIGHTNESS; i++) {
        shadowPixels += brightnessHist[i] || 0;
    }

    const shadowCoverage = shadowPixels / pixelCount;
    const hasShadow = shadowCoverage > SHADOW_THRESHOLDS.COVERAGE;

    return { hasShadow, shadowCoverage };
}

/**
 * Detailed shadow detection with location tracking (JS context, post-capture)
 */
export function detectShadowsDetailedJS(
    pixels: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    channels: number = 4
): ShadowAnalysis {
    const shadowLocations: Array<{ x: number; y: number; size: number }> = [];
    let shadowPixels = 0;
    let totalShadowIntensity = 0;

    const blockSize = SHADOW_THRESHOLDS.BLOCK_SIZE;

    for (let y = 0; y < height; y += blockSize) {
        for (let x = 0; x < width; x += blockSize) {
            let blockShadowPixels = 0;

            for (let by = 0; by < blockSize && y + by < height; by++) {
                for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
                    const idx = ((y + by) * width + (x + bx)) * channels;
                    const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;

                    if (brightness < SHADOW_THRESHOLDS.BRIGHTNESS) {
                        blockShadowPixels++;
                        shadowPixels++;
                        totalShadowIntensity += (SHADOW_THRESHOLDS.BRIGHTNESS - brightness);
                    }
                }
            }

            const blockHeight = Math.min(blockSize, height - y);
            const blockWidth = Math.min(blockSize, width - x);
            const blockTotal = blockHeight * blockWidth;
            const shadowRatio = blockShadowPixels / blockTotal;

            if (shadowRatio > SHADOW_THRESHOLDS.BLOCK_RATIO) {
                shadowLocations.push({
                    x: x + blockSize / 2,
                    y: y + blockSize / 2,
                    size: blockSize,
                });
            }
        }
    }

    const totalPixels = width * height;
    const shadowCoverage = shadowPixels / totalPixels;
    const shadowIntensity = shadowCoverage > 0 ? totalShadowIntensity / shadowPixels / 255 : 0;
    const hasShadow = shadowCoverage > SHADOW_THRESHOLDS.COVERAGE;

    return {
        hasShadow,
        shadowCoverage,
        shadowIntensity,
        shadowLocations,
    };
}