import { Router } from 'express';
import { statisticsController } from '../controllers/statistics.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/user', authMiddleware, statisticsController.getUserStatistics);
router.get('/global', statisticsController.getGlobalStatistics);

export default router;