import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure Multer for temporary storage
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
        cb(null, uploadDir);
    },
    filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req: any, file: any, cb: any) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/avatar', upload.single('avatar'), userController.uploadAvatar);
router.delete('/avatar', userController.deleteAvatar);


export default router;
