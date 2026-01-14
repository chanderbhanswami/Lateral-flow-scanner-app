import { Router } from 'express';
import authRoutes from './auth.routes';
import captureRoutes from './capture.routes';
import concentrationRoutes from './concentration.routes';
import userRoutes from './user.routes';
import healthRoutes from './health.routes';
import statisticsRoutes from './statistics.routes';
import swaggerRoutes from './swagger.routes';

import notificationRoutes from './notification.routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/capture', captureRoutes);
router.use('/concentration', concentrationRoutes);
router.use('/user', userRoutes);
router.use('/health', healthRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/docs', swaggerRoutes);

// API info
router.get('/', (req, res) => {
    res.json({
        name: 'Lateral Flow Scanner API',
        version: '1.0.0',
        status: 'operational',
        endpoints: {
            auth: '/api/auth',
            capture: '/api/capture',
            concentration: '/api/concentration',
            user: '/api/user',
            health: '/api/health',
            statistics: '/api/statistics',
            docs: '/api/docs',
        },
    });
});

export default router;