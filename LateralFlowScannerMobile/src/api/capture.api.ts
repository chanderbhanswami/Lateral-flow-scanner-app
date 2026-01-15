import { apiClient } from './client';
import { API_ENDPOINTS } from '../constants';
import { UploadRequest, UploadResponse, CaptureData, ApiResponse, PaginatedResponse } from '@lateralflowscanner/shared';

export const captureApi = {
    async upload(request: UploadRequest): Promise<UploadResponse> {
        const response = await apiClient.post<ApiResponse<UploadResponse>>(
            API_ENDPOINTS.CAPTURE.UPLOAD,
            request,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 60000, // 60 seconds for upload
            }
        );
        return response.data!;
    },

    async getCapture(id: string): Promise<CaptureData> {
        const url = API_ENDPOINTS.CAPTURE.GET.replace(':id', id);
        const response = await apiClient.get<ApiResponse<CaptureData>>(url);
        return response.data!;
    },

    async listCaptures(page: number = 1, pageSize: number = 20, search?: string): Promise<PaginatedResponse<CaptureData>> {
        const params: any = { page, pageSize };
        if (search) params.search = search;

        const response = await apiClient.get<ApiResponse<PaginatedResponse<CaptureData>>>(
            API_ENDPOINTS.CAPTURE.LIST,
            { params }
        );
        return response.data!;
    },

    async deleteCapture(id: string): Promise<void> {
        const url = API_ENDPOINTS.CAPTURE.DELETE.replace(':id', id);
        await apiClient.delete(url);
    },
};