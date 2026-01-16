/**
 * Accelerometer Utilities - Worklet Compatible
 */

/**
 * Check if device is shaking (Worklet-safe)
 */
export function detectShakeWorklet(
    accelX: number,
    accelY: number,
    accelZ: number,
    threshold: number = 2.5  // m/s² above gravity
): { isShaking: boolean; magnitude: number } {
    'worklet';

    // Calculate total acceleration magnitude
    const magnitude = Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);

    // Subtract gravity (~9.81) to get movement acceleration
    const movement = Math.abs(magnitude - 9.81);
    const isShaking = movement > threshold;

    return { isShaking, magnitude: movement };
}

/**
 * Calculate device orientation from accelerometer (Worklet-safe)
 */
export function getOrientationFromAccelWorklet(
    accelX: number,
    accelY: number,
    accelZ: number
): { orientation: 'portrait' | 'landscape-left' | 'landscape-right' | 'upside-down' | 'face-up' | 'face-down'; tiltAngle: number } {
    'worklet';

    // Determine primary orientation
    const absX = Math.abs(accelX);
    const absY = Math.abs(accelY);
    const absZ = Math.abs(accelZ);

    let orientation: 'portrait' | 'landscape-left' | 'landscape-right' | 'upside-down' | 'face-up' | 'face-down';

    if (absZ > absX && absZ > absY) {
        orientation = accelZ < 0 ? 'face-up' : 'face-down';
    } else if (absY > absX) {
        orientation = accelY < 0 ? 'portrait' : 'upside-down';
    } else {
        orientation = accelX < 0 ? 'landscape-left' : 'landscape-right';
    }

    // Calculate tilt angle from vertical
    const tiltAngle = Math.atan2(Math.sqrt(accelX * accelX + accelZ * accelZ), -accelY) * (180 / Math.PI);

    return { orientation, tiltAngle };
}

/**
 * Smooth accelerometer readings with low-pass filter (Worklet-safe)
 */
export function lowPassFilterWorklet(
    currentValue: number,
    previousValue: number,
    alpha: number = 0.8  // Higher = more smoothing
): number {
    'worklet';
    return alpha * previousValue + (1 - alpha) * currentValue;
}