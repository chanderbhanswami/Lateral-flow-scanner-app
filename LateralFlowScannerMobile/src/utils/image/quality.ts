export const assessImageQuality = (analysis: {
    blurScore: number;
    exposureLevel: number;
    borderDetected: boolean;
    shadowCoverage: number;
    reflectionIntensity: number;
}): {
    score: number;
    grade: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
} => {
    let score = 100;
    const issues: string[] = [];

    // Blur assessment
    if (analysis.blurScore < 500) {
        score -= 30;
        issues.push('Image is very blurry');
    } else if (analysis.blurScore < 1000) {
        score -= 15;
        issues.push('Image has some blur');
    }

    // Exposure assessment
    if (analysis.exposureLevel < 0.3 || analysis.exposureLevel > 0.7) {
        score -= 20;
        issues.push('Poor exposure');
    } else if (analysis.exposureLevel < 0.35 || analysis.exposureLevel > 0.65) {
        score -= 10;
        issues.push('Suboptimal exposure');
    }

    // Border detection
    if (!analysis.borderDetected) {
        score -= 25;
        issues.push('Object border not detected');
    }

    // Shadow assessment
    if (analysis.shadowCoverage > 0.3) {
        score -= 15;
        issues.push('Significant shadows present');
    } else if (analysis.shadowCoverage > 0.1) {
        score -= 5;
        issues.push('Minor shadows present');
    }

    // Reflection assessment
    if (analysis.reflectionIntensity > 0.5) {
        score -= 15;
        issues.push('Strong reflections present');
    } else if (analysis.reflectionIntensity > 0.2) {
        score -= 5;
        issues.push('Minor reflections present');
    }

    score = Math.max(0, Math.min(100, score));

    let grade: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) grade = 'excellent';
    else if (score >= 75) grade = 'good';
    else if (score >= 60) grade = 'fair';
    else grade = 'poor';

    return { score, grade, issues };
};