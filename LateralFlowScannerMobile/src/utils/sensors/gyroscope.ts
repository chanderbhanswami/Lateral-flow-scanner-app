import { GyroscopeData } from '../../types';

export const calculateRotationRate = (data: GyroscopeData): number => {
    return Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
};

export const isDeviceRotating = (data: GyroscopeData, threshold: number = 0.5): boolean => {
    const rate = calculateRotationRate(data);
    return rate > threshold;
};

export const calculateAngularVelocity = (data: GyroscopeData): {
    pitch: number;
    roll: number;
    yaw: number;
} => {
    return {
        pitch: data.x * (180 / Math.PI),
        roll: data.y * (180 / Math.PI),
        yaw: data.z * (180 / Math.PI),
    };
};

export const integrateRotation = (
    readings: GyroscopeData[],
    deltaTime: number
): { x: number; y: number; z: number } => {
    let x = 0, y = 0, z = 0;

    for (const reading of readings) {
        x += reading.x * deltaTime;
        y += reading.y * deltaTime;
        z += reading.z * deltaTime;
    }

    return { x, y, z };
};
