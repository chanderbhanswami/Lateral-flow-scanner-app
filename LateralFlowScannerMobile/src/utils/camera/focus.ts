/**
 * Camera Focus Utilities - Worklet Compatible
 * Helps with focus point calculations
 */

// Inline types
interface FocusPoint {
    x: number;
    y: number;
    normalized: { x: number; y: number };
}

interface FocusAnalysis {
    shouldRefocus: boolean;
    focusConfidence: number;
    recommendation: string;
}

/**
 * Normalize touch coordinates to 0-1 range (Worklet-safe)
 */
export function normalizeFocusPointWorklet(
    touchX: number,
    touchY: number,
    frameWidth: number,
    frameHeight: number
): FocusPoint {
    'worklet';

    return {
        x: touchX,
        y: touchY,
        normalized: {
            x: touchX / frameWidth,
            y: touchY / frameHeight
        }
    };
}

/**
 * Analyze if refocus is needed based on blur score (Worklet-safe)
 */
export function analyzeFocusNeedWorklet(
    laplacianVariance: number,
    threshold: number = 100
): FocusAnalysis {
    'worklet';

    const isBlurry = laplacianVariance < threshold;
    const focusConfidence = Math.min(laplacianVariance / 500, 1);

    let recommendation = 'Focus is sharp';
    if (isBlurry) {
        if (laplacianVariance < 30) {
            recommendation = 'Very blurry - tap to refocus';
        } else {
            recommendation = 'Slightly blurry - consider refocusing';
        }
    }

    return {
        shouldRefocus: isBlurry,
        focusConfidence,
        recommendation
    };
}

/**
 * Calculate focus region of interest (Worklet-safe)
 * Returns a rect around the focus point
 */
export function calculateFocusRegionWorklet(
    focusX: number,
    focusY: number,
    frameWidth: number,
    frameHeight: number,
    regionSize: number = 0.2 // 20% of frame
): { x: number; y: number; width: number; height: number } {
    'worklet';

    const regionWidth = frameWidth * regionSize;
    const regionHeight = frameHeight * regionSize;

    const x = Math.max(0, Math.min(frameWidth - regionWidth, focusX - regionWidth / 2));
    const y = Math.max(0, Math.min(frameHeight - regionHeight, focusY - regionHeight / 2));

    return { x, y, width: regionWidth, height: regionHeight };
}