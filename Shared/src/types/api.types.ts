import { CaptureData } from './capture.types';
import { ConcentrationBatch } from '../schemas/concentration.schema';

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: ApiError;
    message?: string;
    timestamp: string;
}

export interface ApiError {
    code: string;
    message: string;
    details?: any;
    statusCode: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    createdAt: string;
    updatedAt: string;
    isEmailVerified: boolean;
    authProvider?: 'email' | 'google' | 'facebook';
    profilePicture?: string;
}

export interface UploadRequest {
    captureData: CaptureData;
    imageBase64: string;
    batchId?: string;
}

export interface UploadResponse {
    captureId: string;
    imageUrl: string;
    uploadedAt: string;
}
