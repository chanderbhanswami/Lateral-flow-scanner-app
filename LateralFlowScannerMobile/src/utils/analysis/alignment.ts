import { AlignmentAnalysis, AllSensorData } from '../../types';
import { ALIGNMENT_THRESHOLDS } from '../../constants';

/**
 * Calculate device alignment from sensor data
 */
export const calculateAlignment = (sensorData: AllSensorData | null): AlignmentAnalysis => {
    if (!sensorData || !sensorData.accelerometer) {
        return {
            isAligned: false,
            pitch: 0,
            roll: 0,
            yaw: 0,
            levelness: 0,
            recommendation: 'Sensor data unavailable',
        };
    }

    const { x, y, z } = sensorData.accelerometer;

    // Calculate pitch and roll from accelerometer
    const pitch = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
    const roll = Math.atan2(x, Math.sqrt(y * y + z * z)) * (180 / Math.PI);
    const yaw = sensorData.magnetometer ?
        Math.atan2(sensorData.magnetometer.y, sensorData.magnetometer.x) * (180 / Math.PI) : 0;

    const isPitchAligned = Math.abs(pitch) <= ALIGNMENT_THRESHOLDS.PITCH.ACCEPTABLE[1];
    const isRollAligned = Math.abs(roll) <= ALIGNMENT_THRESHOLDS.ROLL.ACCEPTABLE[1];
    const isAligned = isPitchAligned && isRollAligned;

    let recommendation = '';
    if (!isPitchAligned) {
        recommendation += pitch > 0 ? 'Tilt device down. ' : 'Tilt device up. ';
    }
    if (!isRollAligned) {
        recommendation += roll > 0 ? 'Rotate device counter-clockwise. ' : 'Rotate device clockwise. ';
    }
    if (isAligned) {
        recommendation = 'Device is properly aligned';
    }

    const levelness = 1 - Math.min(Math.abs(pitch) + Math.abs(roll), 90) / 90;

    return {
        isAligned,
        pitch,
        roll,
        yaw,
        levelness,
        recommendation,
    };
};