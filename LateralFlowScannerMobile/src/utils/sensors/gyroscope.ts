/**
 * Gyroscope Utilities - Worklet Compatible
 */

/**
 * Check if device is stable (not rotating) (Worklet-safe)
 */
export function detectStabilityWorklet(
    gyroX: number,
    gyroY: number,
    gyroZ: number,
    threshold: number = 0.1  // rad/s
): { isStable: boolean; rotationSpeed: number } {
    'worklet';

    const rotationSpeed = Math.sqrt(gyroX * gyroX + gyroY * gyroY + gyroZ * gyroZ);
    const isStable = rotationSpeed < threshold;

    return { isStable, rotationSpeed };
}

/**
 * Calculate rotation angle from gyroscope over time (Worklet-safe)
 */
export function integrateGyroWorklet(
    gyroValue: number,
    deltaTime: number  // seconds
): number {
    'worklet';

    // Integrate angular velocity to get angle change
    return gyroValue * deltaTime * (180 / Math.PI);  // degrees
}

/**
 * Estimate cumulative rotation (Worklet-safe)
 */
export function estimateTotalRotationWorklet(
    gyroX: number,
    gyroY: number,
    gyroZ: number,
    deltaTime: number
): { rotationX: number; rotationY: number; rotationZ: number } {
    'worklet';

    return {
        rotationX: gyroX * deltaTime * (180 / Math.PI),
        rotationY: gyroY * deltaTime * (180 / Math.PI),
        rotationZ: gyroZ * deltaTime * (180 / Math.PI)
    };
}
