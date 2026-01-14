import { BlurAnalysis } from '../../types';
import { QUALITY_THRESHOLDS } from '../../constants';

/**
 * Analyze image blur using Laplacian variance
 */
export const analyzeBlur = (laplacianVariance: number): BlurAnalysis => {
    const isBlurry = laplacianVariance < QUALITY_THRESHOLDS.BLUR.ACCEPTABLE;

    let focusQuality = 0;
    if (laplacianVariance >= QUALITY_THRESHOLDS.BLUR.EXCELLENT) {
        focusQuality = 1.0;
    } else if (laplacianVariance >= QUALITY_THRESHOLDS.BLUR.GOOD) {
        focusQuality = 0.8;
    } else if (laplacianVariance >= QUALITY_THRESHOLDS.BLUR.ACCEPTABLE) {
        focusQuality = 0.6;
    } else {
        focusQuality = laplacianVariance / QUALITY_THRESHOLDS.BLUR.ACCEPTABLE;
    }

    const edgeStrength = Math.min(laplacianVariance / QUALITY_THRESHOLDS.BLUR.EXCELLENT, 1);

    return {
        isBlurry,
        blurScore: laplacianVariance,
        laplacianVariance,
        edgeStrength,
        focusQuality,
    };
};

/**
 * Calculate blur from image data
 */
export const calculateBlurMetrics = (
    pixels: Uint8ClampedArray,
    width: number,
    height: number
): number => {
    // Simplified Laplacian calculation
    let sum = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;

            // Get neighboring pixels
            const center = pixels[idx];
            const top = pixels[((y - 1) * width + x) * 4];
            const bottom = pixels[((y + 1) * width + x) * 4];
            const left = pixels[(y * width + (x - 1)) * 4];
            const right = pixels[(y * width + (x + 1)) * 4];

            // Calculate Laplacian
            const laplacian = Math.abs(
                4 * center - top - bottom - left - right
            );

            sum += laplacian;
            count++;
        }
    }

    return sum / count;
};