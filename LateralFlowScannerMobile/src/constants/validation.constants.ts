export const VALIDATION_CONSTANTS = {
    IMAGE: {
        MIN_WIDTH: 1920,
        MIN_HEIGHT: 1080,
        MAX_SIZE_MB: 50,
        ALLOWED_FORMATS: ['jpg', 'jpeg', 'png'],
    },
    CONCENTRATION: {
        MIN_LENGTH: 1,
        MAX_LENGTH: 50,
    },
    NOTES: {
        MAX_LENGTH: 500,
    },
};

export const ERROR_MESSAGES = {
    CAMERA: {
        PERMISSION_DENIED: 'Camera permission is required',
        NOT_AVAILABLE: 'Camera is not available',
        INITIALIZATION_FAILED: 'Failed to initialize camera',
    },
    CAPTURE: {
        FAILED: 'Failed to capture image',
        PROCESSING_FAILED: 'Failed to process image',
        UPLOAD_FAILED: 'Failed to upload image',
    },
    NETWORK: {
        NO_CONNECTION: 'No internet connection',
        TIMEOUT: 'Request timeout',
        SERVER_ERROR: 'Server error occurred',
    },
};