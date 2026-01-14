import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation Schemas
const registerTokenSchema = z.object({
    body: z.object({
        token: z.string().min(1, 'Token is required'),
    }),
});

const unregisterTokenSchema = z.object({
    body: z.object({
        token: z.string().min(1, 'Token is required'),
    }),
});

// All routes require authentication
router.use(authMiddleware);

// Token Management
router.post(
    '/token',
    validateRequest(registerTokenSchema),
    notificationController.registerToken
);

router.delete(
    '/token',
    validateRequest(unregisterTokenSchema),
    notificationController.unregisterToken
);

// Notification History
router.get('/', notificationController.listNotifications);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);

export default router;
