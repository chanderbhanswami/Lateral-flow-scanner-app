export const ANALYTICS_EVENTS = {
    // Screen views
    SCREEN_HOME: 'screen_home',
    SCREEN_CAPTURE: 'screen_capture',
    SCREEN_REVIEW: 'screen_review',
    SCREEN_SETTINGS: 'screen_settings',

    // User actions
    CAPTURE_STARTED: 'capture_started',
    CAPTURE_COMPLETED: 'capture_completed',
    CAPTURE_CANCELLED: 'capture_cancelled',
    AUTO_CAPTURE_TRIGGERED: 'auto_capture_triggered',
    MANUAL_CAPTURE_TRIGGERED: 'manual_capture_triggered',

    // Concentration
    CONCENTRATION_SELECTED: 'concentration_selected',
    CONCENTRATION_CREATED: 'concentration_created',
    CONCENTRATION_UPDATED: 'concentration_updated',
    CONCENTRATION_DELETED: 'concentration_deleted',

    // Upload
    UPLOAD_STARTED: 'upload_started',
    UPLOAD_SUCCESS: 'upload_success',
    UPLOAD_FAILED: 'upload_failed',

    // Errors
    ERROR_CAMERA_PERMISSION: 'error_camera_permission',
    ERROR_CAPTURE_FAILED: 'error_capture_failed',
    ERROR_UPLOAD_FAILED: 'error_upload_failed',
    ERROR_NETWORK: 'error_network',

    // Quality
    QUALITY_LOW: 'quality_low',
    QUALITY_GOOD: 'quality_good',
    QUALITY_EXCELLENT: 'quality_excellent',
} as const;