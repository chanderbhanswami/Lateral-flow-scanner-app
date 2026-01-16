/**
 * Alignment Analysis Utilities - Worklet Compatible
 * Analyzes device orientation from sensor data
 */

// Inline types
interface AlignmentAnalysis {
    isLevel: boolean;
    tiltX: number;       // Roll (left-right tilt in degrees)
    tiltY: number;       // Pitch (forward-back tilt in degrees)
    tiltZ: number;       // Yaw (rotation around vertical axis)
    alignmentScore: number;
    recommendation: string;
}

// Inline thresholds
const ALIGNMENT_THRESHOLDS = {
    LEVEL_TOLERANCE: 5,  // degrees
    GOOD_TOLERANCE: 10,
    MAX_TOLERANCE: 30
};

/**
 * Analyze device alignment from accelerometer data (Worklet-safe)
 * Accelerometer values are in m/s², gravity is ~9.8
 */
export function analyzeAlignmentWorklet(
    accelX: number,
    accelY: number,
    accelZ: number
): AlignmentAnalysis {
    'worklet';

    // Calculate tilt angles from accelerometer
    // Phone held vertically (portrait): Z points at target, Y points up
    const g = 9.81;

    // Roll (tilt left/right)
    const tiltX = Math.atan2(accelX, Math.sqrt(accelY * accelY + accelZ * accelZ)) * (180 / Math.PI);

    // Pitch (tilt forward/back)
    const tiltY = Math.atan2(accelY, Math.sqrt(accelX * accelX + accelZ * accelZ)) * (180 / Math.PI);

    // For camera pointing at document, we want Z to be mostly negative (pointing forward)
    const isPointingForward = accelZ < 0;

    // Adjust for landscape orientation if needed
    const tiltZ = isPointingForward ? Math.atan2(accelZ, g) * (180 / Math.PI) : 0;

    // Check if level
    const totalTilt = Math.sqrt(tiltX * tiltX + tiltY * tiltY);
    const isLevel = totalTilt < ALIGNMENT_THRESHOLDS.LEVEL_TOLERANCE;

    // Calculate alignment score (1.0 = perfect)
    let alignmentScore = 1.0;
    if (totalTilt > ALIGNMENT_THRESHOLDS.MAX_TOLERANCE) {
        alignmentScore = 0;
    } else if (totalTilt > ALIGNMENT_THRESHOLDS.GOOD_TOLERANCE) {
        alignmentScore = 0.5;
    } else if (totalTilt > ALIGNMENT_THRESHOLDS.LEVEL_TOLERANCE) {
        alignmentScore = 0.8;
    }

    // Generate recommendation
    let recommendation = 'Device is level';
    if (!isLevel) {
        if (Math.abs(tiltX) > Math.abs(tiltY)) {
            recommendation = tiltX > 0 ? 'Tilt device left' : 'Tilt device right';
        } else {
            recommendation = tiltY > 0 ? 'Tilt device forward' : 'Tilt device back';
        }
    }

    return {
        isLevel,
        tiltX,
        tiltY,
        tiltZ,
        alignmentScore,
        recommendation
    };
}

/**
 * Analyze gyroscope for stability (Worklet-safe)
 */
export function analyzeStabilityWorklet(
    gyroX: number,
    gyroY: number,
    gyroZ: number
): { isStable: boolean; rotationSpeed: number } {
    'worklet';

    // Rotation speed in rad/s
    const rotationSpeed = Math.sqrt(gyroX * gyroX + gyroY * gyroY + gyroZ * gyroZ);

    // Threshold for considering device stable (0.1 rad/s ≈ 5.7 deg/s)
    const isStable = rotationSpeed < 0.1;

    return { isStable, rotationSpeed };
}