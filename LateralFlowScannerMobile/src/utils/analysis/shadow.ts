import { ShadowAnalysis } from '../../types';

/**
 * Detect shadows in image
 */
export const detectShadows = (
    pixels: Uint8ClampedArray,
    width: number,
    height: number
): ShadowAnalysis => {
    const shadowLocations: Array<{ x: number; y: number; size: number }> = [];
    let shadowPixels = 0;
    let totalShadowIntensity = 0;

    const shadowThreshold = 60; // Brightness threshold for shadow
    const blockSize = 32; // Size of blocks to analyze

    for (let y = 0; y < height; y += blockSize) {
        for (let x = 0; x < width; x += blockSize) {
            let blockShadowPixels = 0;
            let blockBrightness = 0;

            for (let by = 0; by < blockSize && y + by < height; by++) {
                for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
                    const idx = ((y + by) * width + (x + bx)) * 4;
                    const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;

                    blockBrightness += brightness;

                    if (brightness < shadowThreshold) {
                        blockShadowPixels++;
                        shadowPixels++;
                        totalShadowIntensity += (shadowThreshold - brightness);
                    }
                }
            }

            const blockTotal = Math.min(blockSize, height - y) * Math.min(blockSize, width - x);
            const shadowRatio = blockShadowPixels / blockTotal;

            if (shadowRatio > 0.3) {
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
    const hasShadow = shadowCoverage > 0.1;

    return {
        hasShadow,
        shadowCoverage,
        shadowIntensity,
        shadowLocations,
    };
};