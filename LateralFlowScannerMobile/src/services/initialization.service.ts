import { useAuthStore } from '../store/authStore';
import { uploadService } from './upload.service';
import { notificationService } from './notification.service';

export const initializeServices = async () => {
    // Check authentication
    await useAuthStore.getState().checkAuth();

    // Initialize notifications
    await notificationService.configure();

    // Retry pending uploads
    try {
        await uploadService.retryPendingUploads();
    } catch (error) {
        console.error('Failed to retry pending uploads:', error);
    }
};