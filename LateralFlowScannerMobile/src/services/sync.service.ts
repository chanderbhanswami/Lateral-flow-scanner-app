import { uploadService } from './upload.service';
import { storageService } from './storage.service';
import { logger } from '../utils/logger';
import NetInfo from '@react-native-community/netinfo';

class SyncService {
    private isSyncing = false;
    private syncInterval: ReturnType<typeof setInterval> | null = null;

    async startAutoSync(intervalMs: number = 60000): Promise<void> {
        if (this.syncInterval) {
            return;
        }

        // Initial sync
        await this.syncPendingUploads();

        // Set up periodic sync
        this.syncInterval = setInterval(() => {
            this.syncPendingUploads();
        }, intervalMs);

        // Listen for network changes
        NetInfo.addEventListener((state) => {
            if (state.isConnected && !this.isSyncing) {
                this.syncPendingUploads();
            }
        });
    }

    stopAutoSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async syncPendingUploads(): Promise<void> {
        if (this.isSyncing) {
            return;
        }

        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
            logger.info('No internet connection, skipping sync');
            return;
        }

        this.isSyncing = true;

        try {
            await uploadService.retryPendingUploads();
            logger.info('Sync completed successfully');
        } catch (error) {
            logger.error('Sync failed', error);
        } finally {
            this.isSyncing = false;
        }
    }

    async getPendingCount(): Promise<number> {
        const pending = await storageService.getPendingCaptures();
        return pending.length;
    }
}

export const syncService = new SyncService();