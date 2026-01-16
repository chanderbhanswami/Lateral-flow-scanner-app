/**
 * Blur Analysis Utilities - Worklet Compatible
 * Uses Laplacian variance for blur detection
 */

// Inline types for Worklet compatibility
interface BlurAnalysis {
    isBlurry: boolean;
    blurScore: number;
    laplacianVariance: number;
    edgeStrength: number;
    focusQuality: number;
}

// Inline thresholds (avoid imports in Worklets)
const BLUR_THRESHOLDS = {
    EXCELLENT: 500,
    GOOD: 200,
    ACCEPTABLE: 100,
    POOR: 50
};

/**
 * Analyze blur from pre-calculated Laplacian variance (from OpenCV)
 */
export function analyzeBlurWorklet(laplacianVariance: number): BlurAnalysis {
    'worklet';

    const isBlurry = laplacianVariance < BLUR_THRESHOLDS.ACCEPTABLE;

    let focusQuality = 0;
    if (laplacianVariance >= BLUR_THRESHOLDS.EXCELLENT) {
        focusQuality = 1.0;
    } else if (laplacianVariance >= BLUR_THRESHOLDS.GOOD) {
        focusQuality = 0.8;
    } else if (laplacianVariance >= BLUR_THRESHOLDS.ACCEPTABLE) {
        focusQuality = 0.6;
    } else {
        focusQuality = laplacianVariance / BLUR_THRESHOLDS.ACCEPTABLE;
    }

    const edgeStrength = laplacianVariance / BLUR_THRESHOLDS.EXCELLENT;
    const clampedEdgeStrength = edgeStrength > 1 ? 1 : edgeStrength;

    return {
        isBlurry,
        blurScore: laplacianVariance,
        laplacianVariance,
        edgeStrength: clampedEdgeStrength,
        focusQuality,
    };
}

/**
 * Calculate Laplacian variance from grayscale buffer (manual, for JS context)
 * Use OpenCV's Laplacian in Worklet context instead
 */
export function calculateLaplacianVarianceJS(
    pixels: Uint8Array,
    width: number,
    height: number
): number {
    // Simplified Laplacian calculation for grayscale
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;

            // Get neighboring pixels (grayscale so single channel)
            const center = pixels[idx];
            const top = pixels[(y - 1) * width + x];
            const bottom = pixels[(y + 1) * width + x];
            const left = pixels[y * width + (x - 1)];
            const right = pixels[y * width + (x + 1)];

            // Calculate Laplacian (2D second derivative approximation)
            const laplacian = 4 * center - top - bottom - left - right;

            sum += laplacian;
            sumSq += laplacian * laplacian;
            count++;
        }
    }

    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);
    return variance > 0 ? variance : 0;
}