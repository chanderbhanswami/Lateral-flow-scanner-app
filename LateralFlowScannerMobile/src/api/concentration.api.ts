import { apiClient } from './client';
import { API_ENDPOINTS } from '../constants';
import { ConcentrationBatch, ApiResponse } from '@lateralflowscanner/shared';

export const concentrationApi = {
    async create(data: Omit<ConcentrationBatch, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<ConcentrationBatch> {
        const response = await apiClient.post<ApiResponse<ConcentrationBatch>>(
            API_ENDPOINTS.CONCENTRATION.CREATE,
            data
        );
        return response.data!;
    },

    async update(id: string, data: Partial<ConcentrationBatch>): Promise<ConcentrationBatch> {
        const url = API_ENDPOINTS.CONCENTRATION.UPDATE.replace(':id', id);
        const response = await apiClient.put<ApiResponse<ConcentrationBatch>>(url, data);
        return response.data!;
    },

    async delete(id: string): Promise<void> {
        const url = API_ENDPOINTS.CONCENTRATION.DELETE.replace(':id', id);
        await apiClient.delete(url);
    },

    async list(): Promise<ConcentrationBatch[]> {
        const response = await apiClient.get<ApiResponse<ConcentrationBatch[]>>(
            API_ENDPOINTS.CONCENTRATION.LIST
        );
        return response.data!;
    },
};