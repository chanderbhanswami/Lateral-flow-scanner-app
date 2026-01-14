export const CAMERA_CONSTANTS = {
    TARGET_RESOLUTION: {
        width: 4032,
        height: 3024,
    },
    TARGET_FPS: 30,
    MIN_FPS: 24,
    MAX_FPS: 60,
    TARGET_ZOOM: 1.0,
    MIN_ZOOM: 1.0,
    MAX_ZOOM: 10.0,
    FOCUS_DISTANCE: {
        CLOSE: 0.1,
        NORMAL: 0.3,
        FAR: 1.0,
    },
    EXPOSURE: {
        MIN: -2.0,
        MAX: 2.0,
        TARGET: 0.0,
    },
    ISO: {
        MIN: 100,
        MAX: 3200,
        TARGET: 400,
    },
    SHUTTER_SPEED: {
        MIN: 1 / 8000,
        MAX: 1 / 30,
        TARGET: 1 / 250,
    },
};

export const QUALITY_THRESHOLDS = {
    BLUR: {
        EXCELLENT: 2000,
        GOOD: 1000,
        ACCEPTABLE: 500,
        POOR: 100,
    },
    EXPOSURE: {
        UNDEREXPOSED_THRESHOLD: 0.3,
        OVEREXPOSED_THRESHOLD: 0.7,
        OPTIMAL_RANGE: [0.4, 0.6],
    },
    ALIGNMENT: {
        PITCH_THRESHOLD: 5,
        ROLL_THRESHOLD: 5,
        YAW_THRESHOLD: 10,
    },
    BORDER_DETECTION: {
        MIN_CONFIDENCE: 0.7,
        MIN_AREA: 0.3,
        MAX_AREA: 0.9,
        ASPECT_RATIO_RANGE: [1.5, 2.5],
    },
};

export const AUTO_CAPTURE_CONDITIONS = {
    MIN_BLUR_SCORE: 1000,
    MAX_EXPOSURE_DEVIATION: 0.15,
    MIN_BORDER_CONFIDENCE: 0.8,
    MAX_ALIGNMENT_ERROR: 5,
    MIN_LIGHT_LEVEL: 100,
    MAX_SHAKE_INTENSITY: 0.3,
    REQUIRED_STABLE_FRAMES: 10,
    STABILITY_TIMEOUT: 5000,
};