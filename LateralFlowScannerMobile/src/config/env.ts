import Config from 'react-native-config';

// Environment configuration using react-native-config
// Values are loaded from .env file at build time

export const ENV = {
    API_BASE_URL: Config.API_BASE_URL || 'https://api.lateralflowscanner.com',
    SENTRY_DSN: Config.SENTRY_DSN || '',
    API_TIMEOUT: parseInt(Config.API_TIMEOUT || '30000', 10),
    ENVIRONMENT: Config.ENVIRONMENT || (__DEV__ ? 'development' : 'production'),
    GOOGLE_WEB_CLIENT_ID: Config.GOOGLE_WEB_CLIENT_ID || '',
    FACEBOOK_APP_ID: Config.FACEBOOK_APP_ID || '',
} as const;