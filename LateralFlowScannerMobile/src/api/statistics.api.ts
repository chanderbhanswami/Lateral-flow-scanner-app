import { apiClient } from './client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse } from '@lateralflowscanner/shared';

export interface UserStatistics {
    totalCaptures: number;
    totalUploads: number;
    lastUploadDate: string | null;
    storageUsed: number;
    capturesByMonth: Record<string, number>;
}

export interface GlobalStatistics {
    totalUsers: number;
    totalCaptures: number;
    activeUsers7Days: number;
    totalStorageUsed: number;
}

export const statisticsApi = {
    async getUserStatistics(): Promise<UserStatistics> {
        try {
            const response = await apiClient.get<ApiResponse<UserStatistics>>(
                API_ENDPOINTS.STATISTICS.USER
            );
            console.log('[StatisticsAPI] User Response:', JSON.stringify(response, null, 2));
            return response.data!;
        } catch (error) {
            console.error('[StatisticsAPI] User Error:', error);
            throw error;
        }
    },

    async getGlobalStatistics(): Promise<GlobalStatistics> {
        try {
            const response = await apiClient.get<ApiResponse<GlobalStatistics>>(
                API_ENDPOINTS.STATISTICS.GLOBAL
            );
            console.log('[StatisticsAPI] Global Response:', JSON.stringify(response, null, 2));
            return response.data!;
        } catch (error) {
            console.error('[StatisticsAPI] Global Error:', error);
            throw error;
        }
    },
};
