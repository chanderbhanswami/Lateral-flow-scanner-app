/**
 * Image Quality Assessment Utilities - Worklet Compatible
 */

// Inline types
interface QualityAssessment {
    overallScore: number;
    isAcceptable: boolean;
    issues: string[];
    recommendation: string;
}

/**
 * Assess overall image quality (Worklet-safe)
 */
export function assessImageQualityWorklet(
    isBlurry: boolean,
    blurScore: number,
    isUnderexposed: boolean,
    isOverexposed: boolean,
    hasShadow: boolean,
    hasReflection: boolean,
    isCentered: boolean,
    isAligned: boolean
): QualityAssessment {
    'worklet';

    const issues: string[] = [];
    let score = 100;

    // Blur penalty
    if (isBlurry) {
        issues.push('Image is blurry');
        score -= blurScore < 30 ? 40 : 20;
    }

    // Exposure penalty
    if (isUnderexposed) {
        issues.push('Image is underexposed');
        score -= 25;
    }
    if (isOverexposed) {
        issues.push('Image is overexposed');
        score -= 25;
    }

    // Shadow penalty
    if (hasShadow) {
        issues.push('Shadow detected');
        score -= 15;
    }

    // Reflection penalty
    if (hasReflection) {
        issues.push('Reflection/glare detected');
        score -= 20;
    }

    // Position penalties
    if (!isCentered) {
        issues.push('Subject not centered');
        score -= 10;
    }
    if (!isAligned) {
        issues.push('Subject not aligned');
        score -= 10;
    }

    // Clamp score
    const finalScore = score < 0 ? 0 : (score > 100 ? 100 : score);

    // Determine recommendation
    let recommendation: string;
    if (finalScore >= 80) {
        recommendation = 'Image quality is excellent';
    } else if (finalScore >= 60) {
        recommendation = 'Image quality is acceptable';
    } else if (finalScore >= 40) {
        recommendation = 'Consider retaking the photo';
    } else {
        recommendation = 'Please retake the photo';
    }

    return {
        overallScore: finalScore,
        isAcceptable: finalScore >= 60,
        issues,
        recommendation
    };
}

/**
 * Calculate sharpness from edge strength (Worklet-safe)
 */
export function calculateSharpnessWorklet(laplacianVariance: number): number {
    'worklet';

    // Normalize to 0-100 scale
    // Typical range: 0-500, with 100+ being acceptable
    const normalized = (laplacianVariance / 500) * 100;
    return normalized > 100 ? 100 : normalized;
}

/**
 * Calculate contrast score (Worklet-safe)
 */
export function calculateContrastScoreWorklet(histogramStd: number): number {
    'worklet';

    // Higher std = more contrast
    // Typical range: 0-80, with 30+ being good
    const normalized = (histogramStd / 80) * 100;
    return normalized > 100 ? 100 : normalized;
}