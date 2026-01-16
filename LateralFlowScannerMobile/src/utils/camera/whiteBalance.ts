/**
 * White Balance Utilities - Worklet Compatible
 */

// Inline types
interface WhiteBalanceAnalysis {
    colorTemperature: number;
    tint: number;
    isNeutral: boolean;
    recommendation: string;
}

/**
 * Analyze white balance from RGB means (Worklet-safe)
 */
export function analyzeWhiteBalanceWorklet(
    meanR: number,
    meanG: number,
    meanB: number
): WhiteBalanceAnalysis {
    'worklet';

    // Calculate color temperature from R/B ratio
    const rbRatio = meanB > 0 ? meanR / meanB : 1;

    // Map ratio to approximate Kelvin
    // Higher R/B = warmer (lower K), Lower R/B = cooler (higher K)
    let colorTemperature: number;
    if (rbRatio > 1.5) {
        colorTemperature = 2700; // Very warm (tungsten)
    } else if (rbRatio > 1.2) {
        colorTemperature = 3500; // Warm (halogen)
    } else if (rbRatio > 0.95) {
        colorTemperature = 5500; // Daylight
    } else if (rbRatio > 0.8) {
        colorTemperature = 6500; // Cloudy
    } else {
        colorTemperature = 8000; // Shade/blue
    }

    // Calculate tint (green-magenta shift)
    const grayAvg = (meanR + meanB) / 2;
    const tint = meanG - grayAvg; // Positive = green, Negative = magenta

    // Check if neutral
    const maxDeviation = Math.max(
        Math.abs(meanR - meanG),
        Math.abs(meanG - meanB),
        Math.abs(meanR - meanB)
    );
    const isNeutral = maxDeviation < 20;

    // Recommendation
    let recommendation = 'White balance is good';
    if (colorTemperature < 4000) {
        recommendation = 'Image is warm - consider WB correction';
    } else if (colorTemperature > 7000) {
        recommendation = 'Image is cool - consider WB correction';
    } else if (Math.abs(tint) > 15) {
        recommendation = tint > 0 ? 'Green tint detected' : 'Magenta tint detected';
    }

    return {
        colorTemperature,
        tint,
        isNeutral,
        recommendation
    };
}

/**
 * Suggest white balance correction (Worklet-safe)
 */
export function suggestWhiteBalanceCorrectionWorklet(
    meanR: number,
    meanG: number,
    meanB: number
): { rGain: number; gGain: number; bGain: number } {
    'worklet';

    // Calculate gains to neutralize
    const avg = (meanR + meanG + meanB) / 3;

    return {
        rGain: avg / meanR,
        gGain: avg / meanG,
        bGain: avg / meanB
    };
}