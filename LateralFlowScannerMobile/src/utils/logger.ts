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
        try {
            Sentry.addBreadcrumb({
                category: 'info',
                message,
                data,
                level: 'info',
            });
        } catch (e) {
            // Sentry might not be initialized or native module missing
        }
    }

    warn(message: string, data?: any) {
        console.warn(`[WARN] ${message}`, data);
        try {
            Sentry.addBreadcrumb({
                category: 'warning',
                message,
                data,
                level: 'warning',
            });
        } catch (e) {
            // Sentry error
        }
    }

    error(message: string, error?: any) {
        console.error(`[ERROR] ${message}`, error);
        try {
            Sentry.captureException(error || new Error(message));
        } catch (e) {
            // Sentry error
        }
    }
}

export const logger = new Logger();