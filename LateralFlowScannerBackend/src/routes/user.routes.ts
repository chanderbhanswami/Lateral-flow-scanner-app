import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);


export default router;
