import { Router } from 'express';
import { captureController } from '../controllers/capture.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { uploadSchema } from '../validators/capture.validator';

const router = Router();

router.use(authMiddleware);

router.post('/upload', validateRequest(uploadSchema), captureController.upload);
router.get('/list', captureController.listCaptures);
router.get('/:id', captureController.getCapture);
router.delete('/:id', captureController.deleteCapture);

export default router;