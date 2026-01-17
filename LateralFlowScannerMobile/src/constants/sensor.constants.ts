export const SENSOR_CONSTANTS = {
    ACCELEROMETER: {
        UPDATE_INTERVAL: 50, // 20Hz for smoother feedback
        SHAKE_THRESHOLD: 1.2, // Lowered from 2.5 for better sensitivity
        STABLE_THRESHOLD: 0.1,
    },
    GYROSCOPE: {
        UPDATE_INTERVAL: 100,
        ROTATION_THRESHOLD: 0.5,
    },
    LIGHT_SENSOR: {
        UPDATE_INTERVAL: 200,
        BRIGHT_THRESHOLD: 10000,
        NORMAL_THRESHOLD: 1000,
        DIM_THRESHOLD: 100,
    },
    PROXIMITY: {
        UPDATE_INTERVAL: 200,
        NEAR_THRESHOLD: 5,
    },
    ORIENTATION: {
        UPDATE_INTERVAL: 100,
    },
};

export const ALIGNMENT_THRESHOLDS = {
    PITCH: {
        OPTIMAL: [-5, 5],
        ACCEPTABLE: [-10, 10],
    },
    ROLL: {
        OPTIMAL: [-5, 5],
        ACCEPTABLE: [-10, 10],
    },
    YAW: {
        OPTIMAL: [-10, 10],
        ACCEPTABLE: [-20, 20],
    },
};
