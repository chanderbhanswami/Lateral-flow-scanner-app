import * as Sentry from '@sentry/react-native';

class Logger {
    debug(message: string, data?: any) {
        if (__DEV__) {
            console.log(`[DEBUG] ${message}`, data);
        }
    }

    info(message: string, data?: any) {
        if (__DEV__) {
            console.info(`[INFO] ${message}`, data);
        }
        Sentry.addBreadcrumb({
            category: 'info',
            message,
            data,
            level: 'info',
        });
    }

    warn(message: string, data?: any) {
        console.warn(`[WARN] ${message}`, data);
        Sentry.addBreadcrumb({
            category: 'warning',
            message,
            data,
            level: 'warning',
        });
    }

    error(message: string, error?: any) {
        console.error(`[ERROR] ${message}`, error);
        Sentry.captureException(error || new Error(message));
    }
}

export const logger = new Logger();