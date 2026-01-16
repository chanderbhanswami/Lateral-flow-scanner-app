/**
 * Light Sensor Utilities - Worklet Compatible
 */

/**
 * Analyze ambient light level (Worklet-safe)
 */
export function analyzeLightLevelWorklet(
    luxValue: number
): { level: 'very-dark' | 'dark' | 'dim' | 'normal' | 'bright' | 'very-bright'; isAdequate: boolean; recommendation: string } {
    'worklet';

    let level: 'very-dark' | 'dark' | 'dim' | 'normal' | 'bright' | 'very-bright';
    let recommendation: string;
    let isAdequate: boolean;

    if (luxValue < 10) {
        level = 'very-dark';
        isAdequate = false;
        recommendation = 'Move to brighter area or use flash';
    } else if (luxValue < 50) {
        level = 'dark';
        isAdequate = false;
        recommendation = 'Increase lighting for better results';
    } else if (luxValue < 200) {
        level = 'dim';
        isAdequate = true;
        recommendation = 'Lighting acceptable but could be better';
    } else if (luxValue < 1000) {
        level = 'normal';
        isAdequate = true;
        recommendation = 'Lighting is good';
    } else if (luxValue < 10000) {
        level = 'bright';
        isAdequate = true;
        recommendation = 'Good lighting conditions';
    } else {
        level = 'very-bright';
        isAdequate = true;
        recommendation = 'Bright light - watch for reflections';
    }

    return { level, isAdequate, recommendation };
}

/**
 * Check if flash is recommended (Worklet-safe)
 */
export function shouldUseFlashWorklet(luxValue: number): boolean {
    'worklet';
    return luxValue < 50;
}

/**
 * Estimate EV adjustment needed for lighting (Worklet-safe)
 */
export function estimateEvAdjustmentForLightWorklet(luxValue: number): number {
    'worklet';

    // Target is around 300 lux (indoor office lighting)
    const targetLux = 300;

    if (luxValue <= 0) return 2;  // Max increase

    // log2(targetLux / currentLux) gives EV adjustment
    const adjustment = Math.log2(targetLux / luxValue);

    // Clamp to reasonable range
    return Math.max(-2, Math.min(2, adjustment));
}