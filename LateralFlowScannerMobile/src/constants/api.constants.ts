import { ENV } from '../config/env';

export const API_ENDPOINTS = {
    AUTH: {
        // Email/Password
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',

        // OAuth
        GOOGLE: '/auth/google',
        FACEBOOK: '/auth/facebook',

        // Email Verification
        VERIFY_EMAIL: '/auth/verify-email',
        VERIFY_LOGIN_OTP: '/auth/verify-login-otp',
        RESEND_VERIFICATION: '/auth/resend-verification',

        // Password Reset
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password',
        RESET_PASSWORD_OTP: '/auth/reset-password-otp',
        CHANGE_PASSWORD: '/auth/change-password',

        // Token Management
        REFRESH: '/auth/refresh',

        // Logout
        LOGOUT: '/auth/logout',
        LOGOUT_ALL: '/auth/logout-all',

        // Session Management
        SESSIONS: '/auth/sessions',

        // User Profile
        ME: '/auth/me',
    },
    CAPTURE: {
        UPLOAD: '/capture/upload',
        GET: '/capture/:id',
        LIST: '/capture/list',
        DELETE: '/capture/:id',
    },
    CONCENTRATION: {
        CREATE: '/concentration/create',
        UPDATE: '/concentration/:id',
        DELETE: '/concentration/:id',
        LIST: '/concentration/list',
    },
    USER: {
        PROFILE: '/user/profile',
        UPDATE: '/user/update',
    },
    NOTIFICATIONS: {
        REGISTER_TOKEN: '/notifications/token',
        UNREGISTER_TOKEN: '/notifications/token',
        LIST: '/notifications',
        MARK_READ: '/notifications/:id/read',
        MARK_ALL_READ: '/notifications/read-all',
    },
    STATISTICS: {
        USER: '/statistics/user',
        GLOBAL: '/statistics/global',
    },
};

export const API_CONFIG = {
    BASE_URL: ENV.API_BASE_URL,
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
};