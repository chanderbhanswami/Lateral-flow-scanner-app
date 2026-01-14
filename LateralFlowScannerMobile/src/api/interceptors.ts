import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { apiClient } from './client';
import { storageService } from '../services/storage.service';
import { useAuthStore } from '../store/authStore';
import Toast from 'react-native-toast-message';

export const setupInterceptors = () => {
    const axiosInstance = apiClient.getInstance();

    // Request interceptor
    axiosInstance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            const token = storageService.getAccessToken();
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error: AxiosError) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor
    axiosInstance.interceptors.response.use(
        (response: AxiosResponse) => {
            return response;
        },
        async (error: AxiosError) => {
            const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

            // Handle 401 Unauthorized
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                try {
                    const refreshToken = storageService.getRefreshToken();
                    if (refreshToken) {
                        const response = await apiClient.post<{ accessToken: string }>('/auth/refresh', {
                            refreshToken,
                        });

                        const newAccessToken = response.accessToken;
                        await storageService.saveTokens(newAccessToken, refreshToken);

                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                        }

                        return axiosInstance(originalRequest);
                    }
                } catch (refreshError) {
                    // Refresh token failed, logout user
                    useAuthStore.getState().logout();
                    Toast.show({
                        type: 'error',
                        text1: 'Session Expired',
                        text2: 'Please login again',
                    });
                    return Promise.reject(refreshError);
                }
            }

            // Handle network errors
            if (!error.response) {
                Toast.show({
                    type: 'error',
                    text1: 'Network Error',
                    text2: 'Please check your internet connection',
                });
            }

            // Handle other errors
            if (error.response?.status && error.response.status >= 500) {
                Toast.show({
                    type: 'error',
                    text1: 'Server Error',
                    text2: 'Please try again later',
                });
            }

            return Promise.reject(error);
        }
    );
};