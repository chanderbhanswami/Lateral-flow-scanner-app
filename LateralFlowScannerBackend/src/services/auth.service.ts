import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { config } from '../config/env';
import { ApiError } from '../utils/error';
import { logger } from '../utils/logger';

export class AuthService {
    async register(data: {
        email: string;
        password: string;
        name: string;
    }): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
    }> {
        try {
            // Check if user exists
            const existingUser = await User.findOne({ email: data.email });
            if (existingUser) {
                throw new ApiError(400, 'User already exists', 'USER_EXISTS');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(data.password, 12);

            // Create user
            const user = await User.create({
                email: data.email,
                password: hashedPassword,
                name: data.name,
                role: 'user',
            });

            // Generate tokens
            const accessToken = this.generateAccessToken(user._id.toString());
            const refreshToken = this.generateRefreshToken(user._id.toString());

            logger.info(`User registered: ${user.email}`);

            return {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
                accessToken,
                refreshToken,
            };
        } catch (error) {
            logger.error('Registration error:', error);
            throw error;
        }
    }

    async login(credentials: {
        email: string;
        password: string;
    }): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
    }> {
        try {
            // Find user
            const user = await User.findOne({ email: credentials.email }).select('+password');
            if (!user) {
                throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
            }

            // Check password
            if (!user.password) {
                throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
            }
            const isMatch = await bcrypt.compare(credentials.password, user.password);
            if (!isMatch) {
                throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
            }

            // Check if user is active
            if (!user.isActive) {
                throw new ApiError(403, 'Account is deactivated', 'ACCOUNT_INACTIVE');
            }

            // Generate tokens
            const accessToken = this.generateAccessToken(user._id.toString());
            const refreshToken = this.generateRefreshToken(user._id.toString());

            logger.info(`User logged in: ${user.email}`);

            return {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
                accessToken,
                refreshToken,
            };
        } catch (error) {
            logger.error('Login error:', error);
            throw error;
        }
    }

    async refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as {
                userId: string;
            };

            // Check if user exists
            const user = await User.findById(decoded.userId);
            if (!user || !user.isActive) {
                throw new ApiError(401, 'Invalid token', 'INVALID_TOKEN');
            }

            // Generate new tokens
            const newAccessToken = this.generateAccessToken(user._id.toString());
            const newRefreshToken = this.generateRefreshToken(user._id.toString());

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            };
        } catch (error) {
            logger.error('Token refresh error:', error);
            throw new ApiError(401, 'Invalid token', 'INVALID_TOKEN');
        }
    }

    async logout(userId: string): Promise<void> {
        try {
            // In a production app, you might want to:
            // 1. Blacklist the token
            // 2. Clear refresh tokens from database
            // 3. Log the logout event

            logger.info(`User logged out: ${userId}`);
        } catch (error) {
            logger.error('Logout error:', error);
            throw error;
        }
    }

    async changePassword(
        userId: string,
        oldPassword: string,
        newPassword: string
    ): Promise<void> {
        try {
            const user = await User.findById(userId).select('+password');
            if (!user) {
                throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
            }

            // Verify old password
            if (!user.password) {
                throw new ApiError(400, 'Cannot change password for OAuth accounts', 'OAUTH_ACCOUNT');
            }
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                throw new ApiError(400, 'Invalid old password', 'INVALID_PASSWORD');
            }

            // Hash new password
            user.password = await bcrypt.hash(newPassword, 12);
            await user.save();

            logger.info(`Password changed for user: ${user.email}`);
        } catch (error) {
            logger.error('Change password error:', error);
            throw error;
        }
    }

    async verifyToken(token: string): Promise<{ userId: string }> {
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
            return decoded;
        } catch (error) {
            throw new ApiError(401, 'Invalid token', 'INVALID_TOKEN');
        }
    }

    private generateAccessToken(userId: string): string {
        return jwt.sign({ userId }, config.JWT_SECRET, {
            expiresIn: config.JWT_EXPIRES_IN,
        } as jwt.SignOptions);
    }

    private generateRefreshToken(userId: string): string {
        return jwt.sign({ userId }, config.JWT_REFRESH_SECRET, {
            expiresIn: config.JWT_REFRESH_EXPIRES_IN,
        } as jwt.SignOptions);
    }
}

export const authService = new AuthService();