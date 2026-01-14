import { Router } from 'express';
import { concentrationController } from '../controllers/concentration.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/create', concentrationController.create);
router.put('/:id', concentrationController.update);
router.delete('/:id', concentrationController.delete);
router.get('/list', concentrationController.list);

export default router;