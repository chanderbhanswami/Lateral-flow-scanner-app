import { ReflectionAnalysis } from '../../types';

/**
 * Detect reflections and glare in image
 */
export const detectReflections = (
    pixels: Uint8ClampedArray,
    width: number,
    height: number
): ReflectionAnalysis => {
    let reflectionPixels = 0;
    let totalReflectionIntensity = 0;
    const glareThreshold = 240; // Very bright pixels
    const reflectionThreshold = 200; // Bright pixels

    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const brightness = (r + g + b) / 3;

        if (brightness > reflectionThreshold) {
            reflectionPixels++;
            totalReflectionIntensity += brightness;
        }
    }

    const totalPixels = width * height;
    const affectedArea = reflectionPixels / totalPixels;
    const reflectionIntensity = affectedArea > 0 ? totalReflectionIntensity / reflectionPixels / 255 : 0;
    const hasReflection = affectedArea > 0.05;

    // Check for glare (very bright spots)
    let glarePixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        if (brightness > glareThreshold) {
            glarePixels++;
        }
    }
    const glareDetected = glarePixels / totalPixels > 0.01;

    return {
        hasReflection,
        reflectionIntensity,
        glareDetected,
        affectedArea,
    };
};