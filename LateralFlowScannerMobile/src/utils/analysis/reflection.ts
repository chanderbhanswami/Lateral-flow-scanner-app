/**
 * Reflection Detection Utilities - Worklet Compatible
 */

// Inline types
interface ReflectionAnalysis {
    hasReflection: boolean;
    reflectionIntensity: number;
    glareDetected: boolean;
    affectedArea: number;
}

// Inline thresholds
const REFLECTION_THRESHOLDS = {
    BRIGHTNESS: 240,
    COVERAGE: 0.05,
    GLARE: 0.01
};

/**
 * Quick reflection detection from histogram (Worklet-safe, fast)
 */
export function detectReflectionsWorklet(
    brightnessHist: number[],
    pixelCount: number
): ReflectionAnalysis {
    'worklet';

    // Count pixels in highlight range (240-255)
    let reflectionPixels = 0;
    let totalBrightness = 0;

    for (let i = REFLECTION_THRESHOLDS.BRIGHTNESS; i < 256; i++) {
        const count = brightnessHist[i] || 0;
        reflectionPixels += count;
        totalBrightness += i * count;
    }

    const affectedArea = reflectionPixels / pixelCount;
    const hasReflection = affectedArea > REFLECTION_THRESHOLDS.COVERAGE;
    const glareDetected = affectedArea > REFLECTION_THRESHOLDS.GLARE;
    const reflectionIntensity = reflectionPixels > 0 ?
        (totalBrightness / reflectionPixels) / 255 : 0;

    return {
        hasReflection,
        reflectionIntensity,
        glareDetected,
        affectedArea
    };
}

/**
 * Detailed reflection detection (JS context, post-capture)
 */
export function detectReflectionsDetailedJS(
    pixels: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    channels: number = 4
): ReflectionAnalysis & { hotspots: Array<{ x: number; y: number; intensity: number }> } {
    let reflectionPixels = 0;
    let totalIntensity = 0;
    const hotspots: Array<{ x: number; y: number; intensity: number }> = [];

    const blockSize = 32;

    for (let y = 0; y < height; y += blockSize) {
        for (let x = 0; x < width; x += blockSize) {
            let blockReflectionPixels = 0;
            let blockIntensity = 0;

            for (let by = 0; by < blockSize && y + by < height; by++) {
                for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
                    const idx = ((y + by) * width + (x + bx)) * channels;
                    const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;

                    if (brightness >= REFLECTION_THRESHOLDS.BRIGHTNESS) {
                        blockReflectionPixels++;
                        blockIntensity += brightness;
                        reflectionPixels++;
                        totalIntensity += brightness;
                    }
                }
            }

            if (blockReflectionPixels > 10) {
                hotspots.push({
                    x: x + blockSize / 2,
                    y: y + blockSize / 2,
                    intensity: blockIntensity / blockReflectionPixels / 255
                });
            }
        }
    }

    const totalPixels = width * height;
    const affectedArea = reflectionPixels / totalPixels;
    const hasReflection = affectedArea > REFLECTION_THRESHOLDS.COVERAGE;
    const glareDetected = affectedArea > REFLECTION_THRESHOLDS.GLARE;
    const reflectionIntensity = reflectionPixels > 0 ? totalIntensity / reflectionPixels / 255 : 0;

    return {
        hasReflection,
        reflectionIntensity,
        glareDetected,
        affectedArea,
        hotspots
    };
}