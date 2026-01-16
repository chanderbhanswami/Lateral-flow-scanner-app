import { create } from 'zustand';
import { User, LoginRequest } from '../types';
import { authApi, GoogleAuthRequest, FacebookAuthRequest } from '../api/auth.api';
import { storageService } from '../services/storage.service';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isEmailVerified: boolean;
    pendingVerificationEmail: string | null;
    pendingLoginOTP: boolean; // New: indicates OTP verification is pending

    // Auth actions
    login: (credentials: LoginRequest) => Promise<{ requiresOTP: boolean }>;
    verifyLoginOTP: (email: string, otp: string) => Promise<void>;
    register: (data: { email: string; password: string; name: string; inviteCode: string }) => Promise<void>;
    loginWithGoogle: (data: GoogleAuthRequest) => Promise<void>;
    loginWithFacebook: (data: FacebookAuthRequest) => Promise<void>;
    logout: () => Promise<void>;
    logoutAllDevices: () => Promise<void>;

    // State management
    setUser: (user: User | null) => void;
    setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
    setPendingVerification: (email: string | null) => void;
    setEmailVerified: (verified: boolean) => void;
    checkAuth: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isEmailVerified: true,
    pendingVerificationEmail: null,
    pendingLoginOTP: false,

    login: async (credentials) => {
        try {
            const response = await authApi.login(credentials);

            // Check if OTP verification is required (new flow)
            if ((response as any).requiresOTP) {
                set({
                    pendingVerificationEmail: (response as any).email || credentials.email,
                    pendingLoginOTP: true,
                });
                return { requiresOTP: true };
            }

            // Legacy: direct login (OAuth returns tokens directly)
            await storageService.saveTokens(response.accessToken, response.refreshToken);
            set({
                user: response.user,
                isAuthenticated: true,
                isEmailVerified: response.user?.isEmailVerified ?? true,
                pendingLoginOTP: false,
            });
            return { requiresOTP: false };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    verifyLoginOTP: async (email: string, otp: string) => {
        try {
            const response = await authApi.verifyLoginOTP({ email, otp });
            await storageService.saveTokens(response.accessToken, response.refreshToken);
            set({
                user: response.user,
                isAuthenticated: true,
                isEmailVerified: true,
                pendingVerificationEmail: null,
                pendingLoginOTP: false,
            });
        } catch (error) {
            console.error('Verify login OTP error:', error);
            throw error;
        }
    },

    register: async (data) => {
        try {
            const response = await authApi.register(data);

            // New flow: registration doesn't return tokens, requires verification
            if ((response as any).requiresVerification) {
                set({
                    pendingVerificationEmail: data.email,
                    pendingLoginOTP: false,
                    isEmailVerified: false,
                });
                return;
            }

            // Legacy: if tokens are returned
            if (response.accessToken) {
                await storageService.saveTokens(response.accessToken, response.refreshToken);
                set({
                    user: response.user,
                    isAuthenticated: true,
                    isEmailVerified: false,
                    pendingVerificationEmail: data.email,
                });
            }
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    },

    loginWithGoogle: async (data) => {
        try {
            const response = await authApi.googleAuth(data);
            await storageService.saveTokens(response.accessToken, response.refreshToken);
            set({
                user: response.user,
                isAuthenticated: true,
                isEmailVerified: true,
            });
        } catch (error) {
            console.error('Google login error:', error);
            throw error;
        }
    },

    loginWithFacebook: async (data) => {
        try {
            const response = await authApi.facebookAuth(data);
            await storageService.saveTokens(response.accessToken, response.refreshToken);
            set({
                user: response.user,
                isAuthenticated: true,
                isEmailVerified: true,
            });
        } catch (error) {
            console.error('Facebook login error:', error);
            throw error;
        }
    },

    logout: async () => {
        try {
            const refreshToken = await storageService.getRefreshToken();
            await authApi.logout(refreshToken || undefined);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            await storageService.clearTokens();
            set({
                user: null,
                isAuthenticated: false,
                isEmailVerified: true,
                pendingVerificationEmail: null,
            });
        }
    },

    logoutAllDevices: async () => {
        try {
            await authApi.logoutAll();
        } catch (error) {
            console.error('Logout all error:', error);
        } finally {
            await storageService.clearTokens();
            set({
                user: null,
                isAuthenticated: false,
                isEmailVerified: true,
                pendingVerificationEmail: null,
            });
        }
    },

    setUser: (user) => {
        set({ user, isAuthenticated: !!user });
    },

    setTokens: async (accessToken, refreshToken) => {
        await storageService.saveTokens(accessToken, refreshToken);
    },

    setPendingVerification: (email) => {
        set({ pendingVerificationEmail: email });
    },

    setEmailVerified: (verified) => {
        set({ isEmailVerified: verified });
    },

    checkAuth: async () => {
        try {
            set({ isLoading: true });
            const token = await storageService.getAccessToken();
            if (token) {
                try {
                    const user = await authApi.getCurrentUser();
                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                        isEmailVerified: user.isEmailVerified ?? true,
                    });
                } catch {
                    // Token invalid, try refresh
                    const refreshToken = await storageService.getRefreshToken();
                    if (refreshToken) {
                        try {
                            const tokens = await authApi.refreshToken(refreshToken);
                            await storageService.saveTokens(tokens.accessToken, tokens.refreshToken);
                            const user = await authApi.getCurrentUser();
                            set({
                                user,
                                isAuthenticated: true,
                                isLoading: false,
                                isEmailVerified: user.isEmailVerified ?? true,
                            });
                        } catch {
                            await storageService.clearTokens();
                            set({ isAuthenticated: false, isLoading: false, user: null });
                        }
                    } else {
                        await storageService.clearTokens();
                        set({ isAuthenticated: false, isLoading: false, user: null });
                    }
                }
            } else {
                set({ isAuthenticated: false, isLoading: false, user: null });
            }
        } catch (error) {
            console.error('Check auth error:', error);
            set({ isAuthenticated: false, isLoading: false, user: null });
        }
    },

    refreshUser: async () => {
        try {
            const user = await authApi.getCurrentUser();
            set({
                user,
                isEmailVerified: user.isEmailVerified ?? true,
            });
        } catch (error) {
            console.error('Refresh user error:', error);
        }
    },
}));