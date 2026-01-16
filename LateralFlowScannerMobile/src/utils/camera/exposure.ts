/**
 * Camera Exposure Utilities - Worklet Compatible
 * Helps calculate and recommend exposure settings
 */

// Inline types
interface ExposureSettings {
    suggestedEV: number;
    shouldAutoExpose: boolean;
    recommendation: string;
}

/**
 * Calculate suggested exposure value from current brightness (Worklet-safe)
 */
export function calculateExposureAdjustmentWorklet(
    meanBrightness: number,
    currentEV: number = 0
): ExposureSettings {
    'worklet';

    // Target brightness (normalized 0-255)
    const targetBrightness = 128;
    const tolerance = 30;

    // Calculate how far we are from target
    const delta = targetBrightness - meanBrightness;
    const needsAdjustment = Math.abs(delta) > tolerance;

    // Estimate EV adjustment needed
    // Roughly: 1 EV = 2x brightness, so delta/128 ≈ EV change needed
    const evAdjustment = (delta / 128) * 2;
    const suggestedEV = currentEV + evAdjustment;

    // Clamp to typical range
    const clampedEV = Math.max(-2, Math.min(2, suggestedEV));

    let recommendation = 'Exposure is good';
    if (meanBrightness < 80) {
        recommendation = 'Increase exposure or add lighting';
    } else if (meanBrightness > 200) {
        recommendation = 'Decrease exposure or reduce lighting';
    }

    return {
        suggestedEV: clampedEV,
        shouldAutoExpose: !needsAdjustment,
        recommendation
    };
}

/**
 * Convert EV to brightness multiplier (Worklet-safe)
 */
export function evToBrightnessMultiplierWorklet(ev: number): number {
    'worklet';
    return Math.pow(2, ev);
}

/**
 * Convert brightness multiplier to EV (Worklet-safe)
 */
export function brightnessMultiplierToEvWorklet(multiplier: number): number {
    'worklet';
    return Math.log2(multiplier);
}