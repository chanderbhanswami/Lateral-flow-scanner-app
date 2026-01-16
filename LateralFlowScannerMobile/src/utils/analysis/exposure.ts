/**
 * Exposure Analysis Utilities - Worklet Compatible
 * Analyzes histogram data for exposure quality
 */

// Inline types for Worklet compatibility
interface HistogramData {
    red: number[];
    green: number[];
    blue: number[];
    brightness: number[];
    mean: number;
    std: number;
    contrast: number;
}

interface ExposureAnalysis {
    isUnderexposed: boolean;
    isOverexposed: boolean;
    exposureLevel: number;
    dynamicRange: number;
    clippedHighlights: number;
    crushedShadows: number;
    recommendation: string;
}

// Inline thresholds
const EXPOSURE_THRESHOLDS = {
    UNDEREXPOSED: 0.25,  // 25% of max brightness
    OVEREXPOSED: 0.85,   // 85% of max brightness
    HIGHLIGHT_CLIP: 240,
    SHADOW_CRUSH: 15
};

/**
 * Analyze exposure from histogram data (Worklet-safe)
 */
export function analyzeExposureWorklet(
    brightnessHist: number[],
    meanBrightness: number,
    pixelCount: number
): ExposureAnalysis {
    'worklet';

    const mean = meanBrightness / 255; // Normalize to 0-1

    const isUnderexposed = mean < EXPOSURE_THRESHOLDS.UNDEREXPOSED;
    const isOverexposed = mean > EXPOSURE_THRESHOLDS.OVEREXPOSED;

    // Calculate clipped highlights (240-255)
    let highlightPixels = 0;
    for (let i = EXPOSURE_THRESHOLDS.HIGHLIGHT_CLIP; i < 256; i++) {
        highlightPixels += brightnessHist[i] || 0;
    }
    const clippedHighlights = highlightPixels / pixelCount;

    // Calculate crushed shadows (0-15)
    let shadowPixels = 0;
    for (let i = 0; i < EXPOSURE_THRESHOLDS.SHADOW_CRUSH; i++) {
        shadowPixels += brightnessHist[i] || 0;
    }
    const crushedShadows = shadowPixels / pixelCount;

    // Dynamic range (count of non-zero histogram bins)
    let nonZeroBins = 0;
    for (let i = 0; i < 256; i++) {
        if (brightnessHist[i] > 0) nonZeroBins++;
    }
    const dynamicRange = nonZeroBins / 256;

    // Recommendation
    let recommendation = 'Exposure is optimal';
    if (isUnderexposed) {
        recommendation = 'Increase lighting or exposure compensation';
    } else if (isOverexposed) {
        recommendation = 'Reduce lighting or exposure compensation';
    } else if (clippedHighlights > 0.1) {
        recommendation = 'Some highlights are clipped';
    } else if (crushedShadows > 0.1) {
        recommendation = 'Some shadows are crushed';
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
}

/**
 * Calculate histogram from RGBA buffer (Worklet-safe with sampling)
 */
export function calculateHistogramWorklet(
    buffer: Uint8Array,
    step: number = 4 // Sampling step for performance
): { brightnessHist: number[]; redHist: number[]; greenHist: number[]; blueHist: number[]; sumBrightness: number; pixelCount: number } {
    'worklet';

    const brightnessHist = new Array(256).fill(0);
    const redHist = new Array(256).fill(0);
    const greenHist = new Array(256).fill(0);
    const blueHist = new Array(256).fill(0);

    let sumBrightness = 0;
    let pixelCount = 0;

    // RGBA buffer, 4 bytes per pixel
    for (let i = 0; i < buffer.length; i += 4 * step) {
        const r = buffer[i] || 0;
        const g = buffer[i + 1] || 0;
        const b = buffer[i + 2] || 0;
        const br = Math.round((r + g + b) / 3);

        redHist[r]++;
        greenHist[g]++;
        blueHist[b]++;
        brightnessHist[br]++;

        sumBrightness += br;
        pixelCount++;
    }

    return { brightnessHist, redHist, greenHist, blueHist, sumBrightness, pixelCount };
}

/**
 * Full histogram calculation for JS context (post-capture)
 */
export function calculateHistogramJS(
    pixels: Uint8ClampedArray,
    width: number,
    height: number
): HistogramData {
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
        sumSquares += (bright - mean) * (bright - mean);
    }
    const std = Math.sqrt(sumSquares / totalPixels);

    const contrast = std / 128;

    return { red, green, blue, brightness, contrast, mean, std };
}