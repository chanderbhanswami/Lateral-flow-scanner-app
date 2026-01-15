import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from '../models/User.model';
import { config } from '../config/env';
import { ApiError } from '../utils/error';
import { logger } from '../utils/logger';
import { emailService } from '../services/email.service';
import { supabaseAuditService } from '../services/supabaseAudit.service';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

// Token expiry constants
const ACCESS_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY = '30d';
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// Google Client
const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

// Helper function to generate tokens
const generateTokens = (userId: string) => {
    const accessToken = jwt.sign(
        { userId },
        config.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
        { userId },
        config.JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
};

// Get device info from request
const getDeviceInfo = (req: Request): string => {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    return userAgent.substring(0, 200); // Limit length
};

export const authController = {
    // ==========================================
    // Email/Password Registration
    // ==========================================
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password, name, inviteCode } = req.body;

            // Validate Invite Code
            let role: 'user' | 'admin' = 'user';

            if (inviteCode === config.ADMIN_INVITE_CODE) {
                role = 'admin';
            } else if (inviteCode === config.INVITE_CODE) {
                role = 'user';
            } else {
                throw new ApiError(403, 'Invalid invite code', 'INVALID_INVITE_CODE');
            }

            // Check if user exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                throw new ApiError(400, 'User already exists', 'USER_EXISTS');
            }

            // Create user
            const user = new User({
                email,
                password,
                name,
                role, // Assign role based on code
                authProvider: 'email',
                isActive: true, // Auto-activate if they have a valid code
            });

            // Generate email verification OTP
            const otp = user.generateEmailVerificationOTP();
            await user.save();

            // Send verification email
            try {
                await emailService.sendVerificationEmail(email, name, otp);
            } catch (emailError) {
                logger.error('Failed to send verification email:', emailError);
                // Don't fail registration if email fails
            }

            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(user._id.toString());

            // Store refresh token
            user.refreshTokens.push({
                token: crypto.createHash('sha256').update(refreshToken).digest('hex'),
                deviceInfo: getDeviceInfo(req),
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
            });
            await user.save();

            // Log audit
            await supabaseAuditService.log({
                userId: user._id.toString(),
                action: 'USER_REGISTER',
                resourceType: 'user',
                resourceId: user._id.toString(),
                status: 'success',
                ipAddress: req.ip as any,
                userAgent: req.headers['user-agent'] as any,
            });

            res.status(201).json({
                success: true,
                message: 'Registration successful. Please verify your email.',
                data: {
                    user: {
                        id: user._id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        isEmailVerified: user.isEmailVerified,
                        authProvider: user.authProvider,
                    },
                    accessToken,
                    refreshToken,
                    expiresIn: 7 * 24 * 60 * 60,
                },
            });
        } catch (error) {
            next(error);
        }
    },

    // ==========================================
    // Email/Password Login
    // ==========================================
    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;

            // Find user with security fields
            const user = await User.findOne({ email })
                .select('+password +loginAttempts +lockUntil');

            if (!user) {
                throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
            }

            // Check if OAuth user trying to use password
            if (user.authProvider !== 'email' && !user.password) {
                throw new ApiError(400, `Please login with ${user.authProvider}`, 'USE_OAUTH');
            }

            // Check if locked
            if (user.isLocked()) {
                throw new ApiError(423, 'Account temporarily locked. Try again later.', 'ACCOUNT_LOCKED');
            }

            // Check if active
            if (!user.isActive) {
                throw new ApiError(403, 'Account is deactivated', 'ACCOUNT_INACTIVE');
            }

            // Verify password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                await user.incrementLoginAttempts();
                throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
            }

            // Reset login attempts
            await user.resetLoginAttempts();

            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(user._id.toString());

            // Store refresh token
            user.refreshTokens.push({
                token: crypto.createHash('sha256').update(refreshToken).digest('hex'),
                deviceInfo: getDeviceInfo(req),
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
            });

            // Clean up expired tokens
            user.refreshTokens = user.refreshTokens.filter(t => t.expiresAt > new Date());
            await user.save();

            // Log audit
            await supabaseAuditService.log({
                userId: user._id.toString(),
                action: 'USER_LOGIN',
                resourceType: 'user',
                status: 'success',
                ipAddress: req.ip as any,
                userAgent: req.headers['user-agent'] as any,
            });

            res.json({
                success: true,
                data: {
                    user: {
                        id: user._id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        isEmailVerified: user.isEmailVerified,
                        authProvider: user.authProvider,
                    },
                    accessToken,
                    refreshToken,
                    expiresIn: 7 * 24 * 60 * 60,
                },
            });
        } catch (error) {
            next(error);
        }
    },

    // ==========================================
    // Google OAuth Login/Register
    // ==========================================
    async googleAuth(req: Request, res: Response, next: NextFunction) {
        try {
            const { idToken, accessToken: googleAccessToken } = req.body;

            if (!idToken) {
                throw new ApiError(400, 'Google ID token required', 'TOKEN_REQUIRED');
            }

            // Verify Google token
            // In production, use google-auth-library to verify
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: config.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();

            if (!payload || !payload.email) {
                throw new ApiError(400, 'Invalid Google token payload', 'INVALID_TOKEN');
            }

            const { email, name, picture, sub: googleId } = payload;

            // Find or create user
            let user = await User.findOne({
                $or: [{ googleId }, { email }],
            });

            if (user) {
                // Update Google ID if not set
                if (!user.googleId) {
                    user.googleId = googleId;
                    await user.save();
                }
            } else {
                // Validate Invite Code for new users
                const { inviteCode } = req.body;
                let role: 'user' | 'admin' = 'user';

                if (inviteCode === config.ADMIN_INVITE_CODE) {
                    role = 'admin';
                } else if (inviteCode === config.INVITE_CODE) {
                    role = 'user';
                } else {
                    throw new ApiError(403, 'Invalid invite code', 'INVALID_INVITE_CODE');
                }

                // Create new user
                user = await User.create({
                    email,
                    name: name || email.split('@')[0],
                    avatar: picture,
                    googleId,
                    authProvider: 'google',
                    role,
                    isEmailVerified: true, // Google emails are verified
                });
            }

            if (!user.isActive) {
                throw new ApiError(403, 'Account is deactivated', 'ACCOUNT_INACTIVE');
            }

            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(user._id.toString());

            // Store refresh token
            user.refreshTokens.push({
                token: crypto.createHash('sha256').update(refreshToken).digest('hex'),
                deviceInfo: getDeviceInfo(req),
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
            });
            user.lastLogin = new Date();
            await user.save();

            // Log audit
            await supabaseAuditService.log({
                userId: user._id.toString(),
                action: 'USER_LOGIN',
                resourceType: 'user',
                details: { provider: 'google' },
                status: 'success',
                ipAddress: req.ip as any,
            });

            res.json({
                success: true,
                data: {
                    user: {
                        id: user._id,
                        email: user.email,
                        name: user.name,
                        avatar: user.avatar,
                        role: user.role,
                        isEmailVerified: user.isEmailVerified,
                        authProvider: user.authProvider,
                    },
                    accessToken,
                    refreshToken,
                    expiresIn: 7 * 24 * 60 * 60,
                },
            });
        } catch (error) {
            next(error);
        }
    },

    // ==========================================
    // Facebook OAuth Login/Register
    // ==========================================
    async facebookAuth(req: Request, res: Response, next: NextFunction) {
        try {
            const { accessToken: fbAccessToken } = req.body;

            if (!fbAccessToken) {
                throw new ApiError(400, 'Facebook access token required', 'TOKEN_REQUIRED');
            }

            // Verify with Facebook Graph API
            const fbResponse = await axios.get(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${fbAccessToken}`);

            // Check if we got valid data
            if (!fbResponse.data || !fbResponse.data.id) {
                throw new ApiError(401, 'Invalid Facebook Access Token', 'INVALID_TOKEN');
            }

            const { id: facebookId, name, email, picture: pictureObj } = fbResponse.data;
            const picture = pictureObj?.data?.url;

            if (!email) {
                throw new ApiError(400, 'Email permission is required from Facebook. Please try again.', 'EMAIL_REQUIRED');
            }

            // Find or create user
            let user = await User.findOne({
                $or: [{ facebookId }, { email }],
            });

            if (user) {
                if (!user.facebookId) {
                    user.facebookId = facebookId;
                    await user.save();
                }
            } else {
                // Validate Invite Code for new users
                const { inviteCode } = req.body;
                let role: 'user' | 'admin' = 'user';

                if (inviteCode === config.ADMIN_INVITE_CODE) {
                    role = 'admin';
                } else if (inviteCode === config.INVITE_CODE) {
                    role = 'user';
                } else {
                    throw new ApiError(403, 'Invalid invite code', 'INVALID_INVITE_CODE');
                }

                user = await User.create({
                    email,
                    name: name || email.split('@')[0],
                    avatar: picture,
                    facebookId,
                    authProvider: 'facebook',
                    role,
                    isEmailVerified: true,
                });
            }

            if (!user.isActive) {
                throw new ApiError(403, 'Account is deactivated', 'ACCOUNT_INACTIVE');
            }

            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(user._id.toString());

            // Store refresh token
            user.refreshTokens.push({
                token: crypto.createHash('sha256').update(refreshToken).digest('hex'),
                deviceInfo: getDeviceInfo(req),
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
            });
            user.lastLogin = new Date();
            await user.save();

            res.json({
                success: true,
                data: {
                    user: {
                        id: user._id,
                        email: user.email,
                        name: user.name,
                        avatar: user.avatar,
                        role: user.role,
                        isEmailVerified: user.isEmailVerified,
                        authProvider: user.authProvider,
                    },
                    accessToken,
                    refreshToken,
                    expiresIn: 7 * 24 * 60 * 60,
                },
            });
        } catch (error) {
            next(error);
        }
    },

    // ==========================================
    // Verify Email OTP
    // ==========================================
    async verifyEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otp } = req.body;

            const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

            const user = await User.findOne({
                email,
                emailVerificationOTP: hashedOTP,
                emailVerificationOTPExpires: { $gt: new Date() },
            }).select('+emailVerificationOTP +emailVerificationOTPExpires');

            if (!user) {
                throw new ApiError(400, 'Invalid or expired OTP', 'INVALID_OTP');
            }

            user.isEmailVerified = true;
            user.emailVerificationOTP = undefined;
            user.emailVerificationOTPExpires = undefined;
            await user.save();

            // Send welcome email
            try {
                await emailService.sendWelcomeEmail(user.email, user.name);
            } catch (error) {
                logger.error('Failed to send welcome email:', error);
            }

            res.json({
                success: true,
                message: 'Email verified successfully',
            });
        } catch (error) {
            next(error);
        }
    },

    // ==========================================
    // Resend Email Verification OTP
    // ==========================================
    async resendVerificationOTP(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;

            const user = await User.findOne({ email });
            if (!user) {
                // Don't reveal if user exists
                res.json({ success: true, message: 'If the email exists, OTP has been sent.' });
                return;
            }

            if (user.isEmailVerified) {
                throw new ApiError(400, 'Email is already verified', 'ALREADY_VERIFIED');
            }

            const otp = user.generateEmailVerificationOTP();
            await user.save();

            // Send email
            await emailService.sendVerificationEmail(user.email, user.name, otp);

            res.json({
                success: true,
                message: 'Verification OTP sent to your email',
            });
        } catch (error) {
            next(error);
        }
    },

    // ==========================================
    // Forgot Password - Send Reset Token
    // ==========================================
    async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;

            const user = await User.findOne({ email });

            // Always return success to prevent email enumeration
            if (!user) {
                res.json({
                    success: true,
                    message: 'If the email exists, reset instructions have been sent.',
                });
                return;
            }

            // Check if OAuth user
            if (user.authProvider !== 'email') {
                throw new ApiError(400, `This account uses ${user.authProvider} login`, 'USE_OAUTH');
            }

            // Generate reset token
            const resetToken = user.generatePasswordResetToken();
            await user.save();

            // Send reset email
            try {
                await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
            } catch (emailError) {
                logger.error('Failed to send reset email:', emailError);
                user.passwordResetToken = undefined;
                user.passwordResetTokenExpires = undefined;
                await user.save();
                throw new ApiError(500, 'Failed to send reset email', 'EMAIL_FAILED');
            }

            res.json({
                success: true,
                message: 'Password reset instructions sent to your email',
            });
        } catch (error) {
            next(error);
        }
    },

    // ==========================================
    // Reset Password with Token
    // ==========================================
    async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { token, password } = req.body;

            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

            const user = await User.findOne({
                passwordResetToken: hashedToken,
                passwordResetTokenExpires: { $gt: new Date() },
            }).select('+passwordResetToken +passwordResetTokenExpires');

            if (!user) {
                throw new ApiError(400, 'Invalid or expired reset token', 'INVALID_TOKEN');
            }

            // Set new password
            user.password = password;
            user.passwordResetToken = undefined;
            user.passwordResetTokenExpires = undefined;

            // Invalidate all refresh tokens (logout from all devices)
            user.refreshTokens = [];

            await user.save();

            // Log audit
            await supabaseAuditService.log({
                userId: user._id.toString(),
                action: 'USER_UPDATE',
                resourceType: 'user',
                details: { action: 'password_reset' },
                status: 'success',
                ipAddress: req.ip as any,
            });

            res.json({
                success: true,
                message: 'Password reset successful. Please login with your new password.',
            });
        } catch (error) {
            next(error);
        }
    },

    // ==========================================
    // Reset Password with OTP (alternative flow)
    // ==========================================
    async resetPasswordWithOTP(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otp, newPassword } = req.body;

            const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

            const user = await User.findOne({
                email,
                passwordResetToken: hashedOTP,
                passwordResetTokenExpires: { $gt: new Date() },
            }).select('+passwordResetToken +passwordResetTokenExpires');

            if (!user) {
                throw new ApiError(400, 'Invalid or expired OTP', 'INVALID_OTP');
            }

            user.password = newPassword;
            user.passwordResetToken = undefined;
            user.passwordResetTokenExpires = undefined;
            user.refreshTokens = [];
            await user.save();

            res.json({
                success: true,
                message: 'Password reset successful',
            });
        } catch (error) {
            next(error);
        }
    },

    // ==========================================
    // Change Password (authenticated)
    // ==========================================
    async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { oldPassword, newPassword } = req.body;
            const userId = (req as any).user.userId;

            const user = await User.findById(userId).select('+password');
            if (!user) {
                throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
            }

            if (user.authProvider !== 'email') {
                throw new ApiError(400, 'Cannot change password for OAuth accounts', 'OAUTH_ACCOUNT');
            }

            const isMatch = await user.comparePassword(oldPassword);
            if (!isMatch) {
                throw new ApiError(400, 'Current password is incorrect', 'INVALID_PASSWORD');
            }

            user.password = newPassword;
            // Optionally logout from all other devices
            // user.refreshTokens = [];
            await user.save();

            res.json({
                success: true,
                message: 'Password changed successfully',
            });
        } catch (error) {
            next(error);
        }
    },

    // ==========================================
    // Refresh Access Token
    // ==========================================
    async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                throw new ApiError(400, 'Refresh token required', 'TOKEN_REQUIRED');
            }

            // Verify token
            let decoded;
            try {
                decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as { userId: string };
            } catch (err) {
                throw new ApiError(401, 'Invalid refresh token', 'INVALID_TOKEN');
            }

            // Find user and check if token exists
            // Generate new hash early
            const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

            // Generate new tokens
            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);
            const hashedNewToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

            // Atomic update: Verify old token exists AND replace it with new one in a single step
            // using the positional ($) operator. This bypasses VersionError.
            const user = await User.findOneAndUpdate(
                {
                    _id: decoded.userId,
                    'refreshTokens.token': hashedToken,
                    isActive: true,
                },
                {
                    $set: {
                        'refreshTokens.$': {
                            token: hashedNewToken,
                            deviceInfo: getDeviceInfo(req),
                            createdAt: new Date(),
                            expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
                        }
                    }
                },
                { new: true } // Return updated doc
            );

            if (!user) {
                // If no document matched, the token was invalid or already used
                throw new ApiError(401, 'Invalid refresh token', 'INVALID_TOKEN');
            }

            res.json({
                success: true,
                data: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                },
            });
        } catch (error) {
            next(error);
        }
    },

    // ==========================================
    // Logout (current device)
    // ==========================================
    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.body;
            const userId = (req as any).user?.userId;

            if (refreshToken && userId) {
                const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
                await User.updateOne(
                    { _id: userId },
                    { $pull: { refreshTokens: { token: hashedToken } } }
                );
            }

            // Log audit
            if (userId) {
                await supabaseAuditService.log({
                    userId,
                    action: 'USER_LOGOUT',
                    resourceType: 'user',
                    status: 'success',
                    ipAddress: req.ip as any,
                });
            }

            res.json({
                success: true,
                message: 'Logged out successfully',
            });
        } catch (error) {
            next(error);
        }
    },

    // ==========================================
    // Logout All Devices
    // ==========================================
    async logoutAll(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;

            await User.updateOne(
                { _id: userId },
                { $set: { refreshTokens: [] } }
            );

            // Log audit
            await supabaseAuditService.log({
                userId,
                action: 'USER_LOGOUT',
                resourceType: 'user',
                details: { scope: 'all_devices' },
                status: 'success',
                ipAddress: req.ip as any,
            });

            res.json({
                success: true,
                message: 'Logged out from all devices',
            });
        } catch (error) {
            next(error);
        }
    },

    // ==========================================
    // Get Active Sessions
    // ==========================================
    async getSessions(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;

            const user = await User.findById(userId);
            if (!user) {
                throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
            }

            // Filter out expired tokens and return session info
            const activeSessions = user.refreshTokens
                .filter(t => t.expiresAt > new Date())
                .map(t => ({
                    deviceInfo: t.deviceInfo,
                    createdAt: t.createdAt,
                    expiresAt: t.expiresAt,
                }));

            res.json({
                success: true,
                data: {
                    sessions: activeSessions,
                    count: activeSessions.length,
                },
            });
        } catch (error) {
            next(error);
        }
    },

    // ==========================================
    // Get Current User
    // ==========================================
    async me(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;

            const user = await User.findById(userId);
            if (!user) {
                throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
            }

            res.json({
                success: true,
                data: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    avatar: user.avatar,
                    phone: user.phone,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                    isPhoneVerified: user.isPhoneVerified,
                    authProvider: user.authProvider,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt,
                },
            });
        } catch (error) {
            next(error);
        }
    },
};