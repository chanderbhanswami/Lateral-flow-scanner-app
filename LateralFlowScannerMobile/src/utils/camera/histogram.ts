/**
 * Camera Histogram Utilities - Worklet Compatible
 * Histogram visualization and analysis helpers
 */

/**
 * Normalize histogram for display (Worklet-safe)
 * Scales values to 0-1 range
 */
export function normalizeHistogramWorklet(histogram: number[]): number[] {
    'worklet';

    let maxVal = 0;
    for (let i = 0; i < 256; i++) {
        if (histogram[i] > maxVal) maxVal = histogram[i];
    }

    if (maxVal === 0) return new Array(256).fill(0);

    const normalized = new Array(256);
    for (let i = 0; i < 256; i++) {
        normalized[i] = histogram[i] / maxVal;
    }

    return normalized;
}

/**
 * Calculate histogram statistics (Worklet-safe)
 */
export function calculateHistogramStatsWorklet(
    histogram: number[],
    pixelCount: number
): { mean: number; std: number; median: number; mode: number } {
    'worklet';

    let sum = 0;
    let modeValue = 0;
    let modeCount = 0;
    let cumulative = 0;
    let median = 128;
    const halfPixels = pixelCount / 2;

    // First pass: mean, mode, median
    for (let i = 0; i < 256; i++) {
        const count = histogram[i] || 0;
        sum += i * count;

        if (count > modeCount) {
            modeCount = count;
            modeValue = i;
        }

        cumulative += count;
        if (cumulative >= halfPixels && median === 128) {
            median = i;
        }
    }

    const mean = sum / pixelCount;

    // Second pass: standard deviation
    let sumSq = 0;
    for (let i = 0; i < 256; i++) {
        const count = histogram[i] || 0;
        sumSq += count * (i - mean) * (i - mean);
    }
    const std = Math.sqrt(sumSq / pixelCount);

    return { mean, std, median, mode: modeValue };
}

/**
 * Downsample histogram for efficient display (Worklet-safe)
 */
export function downsampleHistogramWorklet(
    histogram: number[],
    bins: number = 64
): number[] {
    'worklet';

    const binSize = 256 / bins;
    const downsampled = new Array(bins).fill(0);

    for (let i = 0; i < 256; i++) {
        const binIndex = Math.floor(i / binSize);
        if (binIndex < bins) {
            downsampled[binIndex] += histogram[i] || 0;
        }
    }

    return downsampled;
}