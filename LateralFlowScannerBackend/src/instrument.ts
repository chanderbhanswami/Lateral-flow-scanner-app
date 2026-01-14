// This file must be imported FIRST, before any other imports
// Sentry v8 requires initialization before express is imported
import * as Sentry from '@sentry/node';
import { config } from './config/env';

// Initialize Sentry before anything else
if (config.SENTRY_DSN) {
    Sentry.init({
        dsn: config.SENTRY_DSN,
        environment: config.NODE_ENV,
        tracesSampleRate: 1.0,
        integrations: [
            // Enable HTTP calls tracing
            Sentry.httpIntegration(),
            // Enable Express.js middleware tracing
            Sentry.expressIntegration(),
        ],
    });
}

export { Sentry };
