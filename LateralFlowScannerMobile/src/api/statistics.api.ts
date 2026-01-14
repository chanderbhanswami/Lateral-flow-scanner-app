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
        const response = await apiClient.get<ApiResponse<UserStatistics>>(
            API_ENDPOINTS.STATISTICS.USER
        );
        return response.data!;
    },

    async getGlobalStatistics(): Promise<GlobalStatistics> {
        const response = await apiClient.get<ApiResponse<GlobalStatistics>>(
            API_ENDPOINTS.STATISTICS.GLOBAL
        );
        return response.data!;
    },
};
