import { apiClient } from './client';
import { API_ENDPOINTS } from '../constants';
import { LoginRequest, LoginResponse, ApiResponse, User } from '@lateralflowscanner/shared';

export interface GoogleAuthRequest {
    idToken: string;
    accessToken?: string;
    inviteCode?: string;
}

export interface FacebookAuthRequest {
    accessToken: string;
    email?: string;
    name?: string;
    picture?: string;
    inviteCode?: string;
}

export interface VerifyEmailRequest {
    email: string;
    otp: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    password: string;
}

export interface ChangePasswordRequest {
    oldPassword: string;
    newPassword: string;
}

export interface Session {
    deviceInfo: string;
    createdAt: string;
    expiresAt: string;
}

export const authApi = {
    // ==========================================
    // Email/Password Authentication
    // ==========================================
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        const response = await apiClient.post<ApiResponse<LoginResponse>>(
            API_ENDPOINTS.AUTH.LOGIN,
            credentials
        );
        // Handle both wrapped (ApiResponse) and unwrapped formats
        return (response as any).data ?? response as unknown as LoginResponse;
    },

    async register(data: { email: string; password: string; name: string; inviteCode: string }): Promise<LoginResponse> {
        const response = await apiClient.post<ApiResponse<LoginResponse>>(
            API_ENDPOINTS.AUTH.REGISTER,
            data
        );
        // Handle both wrapped (ApiResponse) and unwrapped formats
        return (response as any).data ?? response as unknown as LoginResponse;
    },

    // ==========================================
    // OAuth Authentication
    // ==========================================
    async googleAuth(data: GoogleAuthRequest): Promise<LoginResponse> {
        const response = await apiClient.post<ApiResponse<LoginResponse>>(
            API_ENDPOINTS.AUTH.GOOGLE,
            data
        );
        // Handle both wrapped (ApiResponse) and unwrapped formats
        return (response as any).data ?? response as unknown as LoginResponse;
    },

    async facebookAuth(data: FacebookAuthRequest): Promise<LoginResponse> {
        const response = await apiClient.post<ApiResponse<LoginResponse>>(
            API_ENDPOINTS.AUTH.FACEBOOK,
            data
        );
        // Handle both wrapped (ApiResponse) and unwrapped formats
        return (response as any).data ?? response as unknown as LoginResponse;
    },

    // ==========================================
    // Email Verification
    // ==========================================
    async verifyEmail(data: VerifyEmailRequest): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>(
            API_ENDPOINTS.AUTH.VERIFY_EMAIL,
            data
        );
        return response.data!;
    },

    async resendVerificationOTP(email: string): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>(
            API_ENDPOINTS.AUTH.RESEND_VERIFICATION,
            { email }
        );
        return response.data!;
    },

    async verifyLoginOTP(data: VerifyEmailRequest): Promise<LoginResponse> {
        const response = await apiClient.post<ApiResponse<LoginResponse>>(
            API_ENDPOINTS.AUTH.VERIFY_LOGIN_OTP,
            data
        );
        return (response as any).data ?? response as unknown as LoginResponse;
    },

    // ==========================================
    // Password Reset
    // ==========================================
    async forgotPassword(email: string): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>(
            API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
            { email }
        );
        return response.data!;
    },

    async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>(
            API_ENDPOINTS.AUTH.RESET_PASSWORD,
            data
        );
        return response.data!;
    },

    async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>(
            API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
            data
        );
        return response.data!;
    },

    async resetPasswordWithOTP(data: { email: string; otp: string; password: string }): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>(
            API_ENDPOINTS.AUTH.RESET_PASSWORD_OTP,
            data
        );
        return response.data!;
    },

    // ==========================================
    // Token Management
    // ==========================================
    async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        const response = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
            API_ENDPOINTS.AUTH.REFRESH,
            { refreshToken }
        );
        return response.data!;
    },

    // ==========================================
    // Session Management
    // ==========================================
    async logout(refreshToken?: string): Promise<void> {
        await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
    },

    async logoutAll(): Promise<void> {
        await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT_ALL);
    },

    async getSessions(): Promise<{ sessions: Session[]; count: number }> {
        const response = await apiClient.get<ApiResponse<{ sessions: Session[]; count: number }>>(
            API_ENDPOINTS.AUTH.SESSIONS
        );
        return response.data!;
    },

    // ==========================================
    // User Profile
    // ==========================================
    async getCurrentUser(): Promise<User> {
        const response = await apiClient.get<ApiResponse<User>>(
            API_ENDPOINTS.AUTH.ME
        );
        return response.data!;
    },

    async updateProfile(data: { name?: string; phone?: string; avatar?: string; settings?: any }): Promise<User> {
        const response = await apiClient.patch<ApiResponse<User>>(
            API_ENDPOINTS.AUTH.ME,
            data
        );
        return response.data!;
    },

    async uploadAvatar(data: FormData): Promise<{ message: string; data: { avatar: string } }> {
        const response = await apiClient.post<ApiResponse<{ message: string; data: { avatar: string } }>>(
            '/users/avatar', // Explicit endpoint since it might differ from constant
            data,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data!;
    },

    async deleteAvatar(): Promise<{ message: string }> {
        const response = await apiClient.delete<ApiResponse<{ message: string }>>(
            '/users/avatar'
        );
        return response.data!;
    },
};