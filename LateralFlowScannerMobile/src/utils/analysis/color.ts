/**
 * Color Analysis Utilities - Worklet Compatible
 * Analyzes color distribution and white balance
 */

// Inline types
interface ColorAnalysis {
    dominantColor: { r: number; g: number; b: number };
    colorTemperature: number;
    saturation: number;
    whiteBalanceOffset: { r: number; g: number; b: number };
    isNeutral: boolean;
    recommendation: string;
}

// Inline thresholds
const COLOR_THRESHOLDS = {
    NEUTRAL_TOLERANCE: 0.1,
    SATURATION_LOW: 0.2,
    SATURATION_HIGH: 0.8
};

/**
 * Quick color analysis from histogram data (Worklet-safe)
 */
export function analyzeColorWorklet(
    redHist: number[],
    greenHist: number[],
    blueHist: number[],
    pixelCount: number
): ColorAnalysis {
    'worklet';

    // Calculate mean RGB
    let sumR = 0, sumG = 0, sumB = 0;
    for (let i = 0; i < 256; i++) {
        sumR += i * (redHist[i] || 0);
        sumG += i * (greenHist[i] || 0);
        sumB += i * (blueHist[i] || 0);
    }

    const meanR = sumR / pixelCount;
    const meanG = sumG / pixelCount;
    const meanB = sumB / pixelCount;

    // Dominant color (simplified - just using means)
    const dominantColor = {
        r: Math.round(meanR),
        g: Math.round(meanG),
        b: Math.round(meanB)
    };

    // White balance offset (how far from gray)
    const gray = (meanR + meanG + meanB) / 3;
    const whiteBalanceOffset = {
        r: (meanR - gray) / 255,
        g: (meanG - gray) / 255,
        b: (meanB - gray) / 255
    };

    // Check if neutral (balanced RGB)
    const maxOffset = Math.max(
        Math.abs(whiteBalanceOffset.r),
        Math.abs(whiteBalanceOffset.g),
        Math.abs(whiteBalanceOffset.b)
    );
    const isNeutral = maxOffset < COLOR_THRESHOLDS.NEUTRAL_TOLERANCE;

    // Estimate color temperature (simplified)
    // Higher R/B ratio = warmer, lower = cooler
    const rbRatio = meanB > 0 ? meanR / meanB : 1;
    let colorTemperature = 6500; // Neutral daylight
    if (rbRatio > 1.2) {
        colorTemperature = 3500; // Warm/tungsten
    } else if (rbRatio < 0.8) {
        colorTemperature = 8500; // Cool/shade
    }

    // Calculate saturation (simplified from RGB)
    const maxC = Math.max(meanR, meanG, meanB);
    const minC = Math.min(meanR, meanG, meanB);
    const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;

    // Recommendation
    let recommendation = 'Color balance is good';
    if (!isNeutral) {
        if (whiteBalanceOffset.r > 0.1) {
            recommendation = 'Image is too warm (reddish)';
        } else if (whiteBalanceOffset.b > 0.1) {
            recommendation = 'Image is too cool (bluish)';
        } else if (whiteBalanceOffset.g > 0.1) {
            recommendation = 'Image has green tint';
        }
    }

    return {
        dominantColor,
        colorTemperature,
        saturation,
        whiteBalanceOffset,
        isNeutral,
        recommendation
    };
}

/**
 * Convert RGB to HSL (Worklet-safe helper)
 */
export function rgbToHslWorklet(r: number, g: number, b: number): { h: number; s: number; l: number } {
    'worklet';

    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;

    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;

    if (max === min) {
        return { h: 0, s: 0, l };
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h = 0;
    if (max === rn) {
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    } else if (max === gn) {
        h = ((bn - rn) / d + 2) / 6;
    } else {
        h = ((rn - gn) / d + 4) / 6;
    }

    return { h: h * 360, s, l };
}