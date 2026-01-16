import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import {
    loginSchema,
    registerSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
    verifyEmailSchema,
    googleAuthSchema,
    facebookAuthSchema,
    refreshTokenSchema,
} from '../validators/auth.validator';

const router = Router();

// ==========================================
// Public Routes (no authentication required)
// ==========================================

// Email/Password Authentication
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);

// OAuth Authentication
router.post('/google', validateRequest(googleAuthSchema), authController.googleAuth);
router.post('/facebook', validateRequest(facebookAuthSchema), authController.facebookAuth);

// Email Verification
router.post('/verify-email', validateRequest(verifyEmailSchema), authController.verifyEmail);
router.post('/verify-login-otp', validateRequest(verifyEmailSchema), authController.verifyLoginOTP);
router.post('/resend-verification', authController.resendVerificationOTP);

// Password Reset (unauthenticated)
router.post('/forgot-password', validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), authController.resetPassword);
router.post('/reset-password-otp', authController.resetPasswordWithOTP);

// Token Management
router.post('/refresh', validateRequest(refreshTokenSchema), authController.refreshToken);

// ==========================================
// Protected Routes (authentication required)
// ==========================================

// Logout
router.post('/logout', authMiddleware, authController.logout);
router.post('/logout-all', authMiddleware, authController.logoutAll);

// Password Change (authenticated)
router.post('/change-password', authMiddleware, validateRequest(changePasswordSchema), authController.changePassword);

// Session Management
router.get('/sessions', authMiddleware, authController.getSessions);

// Get Current User
router.get('/me', authMiddleware, authController.me);

export default router;