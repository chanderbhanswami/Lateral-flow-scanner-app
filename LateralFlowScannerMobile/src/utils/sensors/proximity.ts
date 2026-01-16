/**
 * Proximity Sensor Utilities - Worklet Compatible
 */

/**
 * Check if something is too close to camera (Worklet-safe)
 */
export function checkProximityWorklet(
    isNear: boolean,
    distanceCm: number | null
): { blocked: boolean; warning: string | null } {
    'worklet';

    if (isNear) {
        return {
            blocked: true,
            warning: 'Object too close to camera - move device back'
        };
    }

    if (distanceCm !== null && distanceCm < 5) {
        return {
            blocked: true,
            warning: 'Object very close to camera lens'
        };
    }

    return { blocked: false, warning: null };
}

/**
 * Estimate if camera might be covered (Worklet-safe)
 */
export function isCameraCoveredWorklet(
    isNear: boolean,
    lightLux: number
): boolean {
    'worklet';

    // If proximity sensor detects something near AND light is very low
    return isNear && lightLux < 5;
}