import { authApi, GoogleAuthRequest, FacebookAuthRequest } from '../api/auth.api';
import { storageService } from './storage.service';
import { LoginRequest, LoginResponse, User } from '../types';
import { logger } from '../utils/logger';

class AuthService {
    private refreshTokenPromise: Promise<string> | null = null;

    // ==========================================
    // Email/Password Authentication
    // ==========================================
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        try {
            const response = await authApi.login(credentials);
            await this.saveAuthData(response);
            return response;
        } catch (error) {
            logger.error('Login error', error);
            throw error;
        }
    }

    async register(data: {
        email: string;
        password: string;
        name: string;
        inviteCode: string;
    }): Promise<LoginResponse> {
        try {
            const response = await authApi.register(data);
            await this.saveAuthData(response);
            return response;
        } catch (error) {
            logger.error('Register error', error);
            throw error;
        }
    }

    // ==========================================
    // OAuth Authentication
    // ==========================================
    async loginWithGoogle(data: GoogleAuthRequest): Promise<LoginResponse> {
        try {
            const response = await authApi.googleAuth(data);
            await this.saveAuthData(response);
            return response;
        } catch (error) {
            logger.error('Google login error', error);
            throw error;
        }
    }

    async loginWithFacebook(data: FacebookAuthRequest): Promise<LoginResponse> {
        try {
            const response = await authApi.facebookAuth(data);
            await this.saveAuthData(response);
            return response;
        } catch (error) {
            logger.error('Facebook login error', error);
            throw error;
        }
    }

    // ==========================================
    // Email Verification
    // ==========================================
    async verifyEmail(email: string, otp: string): Promise<{ message: string }> {
        try {
            return await authApi.verifyEmail({ email, otp });
        } catch (error) {
            logger.error('Email verification error', error);
            throw error;
        }
    }

    async resendVerificationOTP(email: string): Promise<{ message: string }> {
        try {
            return await authApi.resendVerificationOTP(email);
        } catch (error) {
            logger.error('Resend OTP error', error);
            throw error;
        }
    }

    // ==========================================
    // Password Reset
    // ==========================================
    async forgotPassword(email: string): Promise<{ message: string }> {
        try {
            return await authApi.forgotPassword(email);
        } catch (error) {
            logger.error('Forgot password error', error);
            throw error;
        }
    }

    async resetPassword(token: string, password: string): Promise<{ message: string }> {
        try {
            return await authApi.resetPassword({ token, password });
        } catch (error) {
            logger.error('Reset password error', error);
            throw error;
        }
    }

    async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
        try {
            return await authApi.changePassword({ oldPassword, newPassword });
        } catch (error) {
            logger.error('Change password error', error);
            throw error;
        }
    }

    // ==========================================
    // Session Management
    // ==========================================
    async logout(): Promise<void> {
        try {
            const refreshToken = await storageService.getRefreshToken();
            await authApi.logout(refreshToken || undefined);
        } catch (error) {
            logger.error('Logout error', error);
        } finally {
            await this.clearAuthData();
        }
    }

    async logoutAllDevices(): Promise<void> {
        try {
            await authApi.logoutAll();
        } catch (error) {
            logger.error('Logout all error', error);
        } finally {
            await this.clearAuthData();
        }
    }

    async getSessions(): Promise<{ sessions: any[]; count: number }> {
        try {
            return await authApi.getSessions();
        } catch (error) {
            logger.error('Get sessions error', error);
            throw error;
        }
    }

    // ==========================================
    // Token Management
    // ==========================================
    async refreshAccessToken(): Promise<string> {
        // Prevent multiple simultaneous refresh requests
        if (this.refreshTokenPromise) {
            return this.refreshTokenPromise;
        }

        this.refreshTokenPromise = this.performTokenRefresh();

        try {
            const newAccessToken = await this.refreshTokenPromise;
            return newAccessToken;
        } finally {
            this.refreshTokenPromise = null;
        }
    }

    private async performTokenRefresh(): Promise<string> {
        const refreshToken = await storageService.getRefreshToken();

        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await authApi.refreshToken(refreshToken);
            await storageService.saveTokens(response.accessToken, response.refreshToken);
            return response.accessToken;
        } catch (error) {
            await this.clearAuthData();
            throw error;
        }
    }

    // ==========================================
    // Auth State
    // ==========================================
    async isAuthenticated(): Promise<boolean> {
        const accessToken = await storageService.getAccessToken();
        return !!accessToken;
    }

    async getCurrentUser(): Promise<User | null> {
        try {
            return await authApi.getCurrentUser();
        } catch (error) {
            logger.error('Get current user error', error);
            return null;
        }
    }

    // ==========================================
    // Storage Helpers
    // ==========================================
    private async saveAuthData(response: LoginResponse): Promise<void> {
        await storageService.saveTokens(response.accessToken, response.refreshToken);
    }

    private async clearAuthData(): Promise<void> {
        await storageService.clearTokens();
    }

    // ==========================================
    // JWT Decoding (for offline user info)
    // ==========================================
    decodeJWT(token: string): any {
        try {
            const parts = token.split('.');
            const base64Url = parts[1];
            if (!base64Url) {
                return {};
            }
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = this.base64Decode(base64);
            return JSON.parse(jsonPayload);
        } catch (error) {
            return {};
        }
    }

    private base64Decode(str: string): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let output = '';

        // Pad the string if necessary
        const padded = str + '==='.slice(0, (4 - (str.length % 4)) % 4);

        for (let i = 0; i < padded.length; i += 4) {
            const enc1 = chars.indexOf(padded.charAt(i));
            const enc2 = chars.indexOf(padded.charAt(i + 1));
            const enc3 = chars.indexOf(padded.charAt(i + 2));
            const enc4 = chars.indexOf(padded.charAt(i + 3));

            const chr1 = (enc1 << 2) | (enc2 >> 4);
            const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            const chr3 = ((enc3 & 3) << 6) | enc4;

            output += String.fromCharCode(chr1);
            if (enc3 !== 64) output += String.fromCharCode(chr2);
            if (enc4 !== 64) output += String.fromCharCode(chr3);
        }

        return decodeURIComponent(escape(output));
    }
}

export const authService = new AuthService();