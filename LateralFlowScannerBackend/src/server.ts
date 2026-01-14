// IMPORTANT: instrument.ts must be imported FIRST for Sentry to work correctly
import { Sentry } from './instrument';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { initializeKafka } from './config/kafka';
import { initWorkers, shutdownWorkers } from './config/initWorkers';
import routes from './routes';
import { errorMiddleware } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { config } from './config/env';
import { supabaseAuditService } from './services/supabaseAudit.service';
import { r2Service } from './services/r2.service';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
}));
app.use(compression());

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Note: express-mongo-sanitize removed due to conflict with Sentry OpenTelemetry
// MongoDB injection protection is handled by:
// 1. mongoose schema validation
// 2. zod input validation in validators/
// 3. parameterized queries (never string concatenation)

// Logging
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim()),
    },
}));

// Health check (simple, no middleware)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Sentry Error Handler (must be before custom error middleware)
if (config.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}

// Error handling
app.use(errorMiddleware);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

const PORT = config.PORT || 3000;

const startServer = async () => {
    try {
        // Connect to database
        await connectDatabase();
        logger.info('Database connected');

        // Connect to Redis
        await connectRedis();
        logger.info('Redis connected');

        // Initialize Kafka
        await initializeKafka();
        logger.info('Kafka initialized');

        // Initialize Background Workers
        await initWorkers();
        logger.info('Background workers initialized');

        // Initialize Supabase audit service (for PostgreSQL logging)
        await supabaseAuditService.initialize();
        if (supabaseAuditService.isConfigured()) {
            logger.info('Supabase audit service initialized');
        }

        // Verify R2 connection
        await r2Service.verifyConnection();
        logger.info('Cloudflare R2 connected');

        // Start server
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    await shutdownWorkers();
    await supabaseAuditService.shutdown();
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;