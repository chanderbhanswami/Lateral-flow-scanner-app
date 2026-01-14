import { ExposureAnalysis, HistogramData } from '../../types';
import { QUALITY_THRESHOLDS } from '../../constants';

/**
 * Analyze exposure from histogram data
 */
export const analyzeExposure = (histogram: HistogramData): ExposureAnalysis => {
    const mean = histogram.mean / 255; // Normalize to 0-1

    const isUnderexposed = mean < QUALITY_THRESHOLDS.EXPOSURE.UNDEREXPOSED_THRESHOLD;
    const isOverexposed = mean > QUALITY_THRESHOLDS.EXPOSURE.OVEREXPOSED_THRESHOLD;

    // Calculate clipped highlights and crushed shadows
    const totalPixels = histogram.brightness.reduce((a, b) => a + b, 0);
    const clippedHighlights = histogram.brightness.slice(240).reduce((a, b) => a + b, 0) / totalPixels;
    const crushedShadows = histogram.brightness.slice(0, 15).reduce((a, b) => a + b, 0) / totalPixels;

    // Dynamic range (simplified)
    const nonZeroBins = histogram.brightness.filter(v => v > 0).length;
    const dynamicRange = nonZeroBins / 256;

    let recommendation = '';
    if (isUnderexposed) {
        recommendation = 'Increase lighting or exposure compensation';
    } else if (isOverexposed) {
        recommendation = 'Reduce lighting or exposure compensation';
    } else if (clippedHighlights > 0.1) {
        recommendation = 'Some highlights are clipped';
    } else if (crushedShadows > 0.1) {
        recommendation = 'Some shadows are crushed';
    } else {
        recommendation = 'Exposure is optimal';
    }

    return {
        isUnderexposed,
        isOverexposed,
        exposureLevel: mean,
        dynamicRange,
        clippedHighlights,
        crushedShadows,
        recommendation,
    };
};

/**
 * Calculate histogram from image data
 */
export const calculateHistogram = (
    pixels: Uint8ClampedArray,
    width: number,
    height: number
): HistogramData => {
    const red = new Array(256).fill(0);
    const green = new Array(256).fill(0);
    const blue = new Array(256).fill(0);
    const brightness = new Array(256).fill(0);

    let sumR = 0, sumG = 0, sumB = 0, sumBrightness = 0;
    const totalPixels = width * height;

    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const bright = Math.round((r + g + b) / 3);

        red[r]++;
        green[g]++;
        blue[b]++;
        brightness[bright]++;

        sumR += r;
        sumG += g;
        sumB += b;
        sumBrightness += bright;
    }

    const mean = sumBrightness / totalPixels;

    // Calculate standard deviation
    let sumSquares = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        const bright = Math.round((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
        sumSquares += Math.pow(bright - mean, 2);
    }
    const std = Math.sqrt(sumSquares / totalPixels);

    // Calculate contrast (simplified as std dev normalized)
    const contrast = std / 128;

    return {
        red,
        green,
        blue,
        brightness,
        contrast,
        mean,
        std,
    };
};