import { uploadService } from './upload.service';
import { storageService } from './storage.service';
import { logger } from '../utils/logger';
import { checkInternetConnection, waitForConnection } from '../utils/network';
import NetInfo from '@react-native-community/netinfo';

class SyncService {
    private isSyncing = false;
    private syncInterval: ReturnType<typeof setInterval> | null = null;
    private unsubscribeNetInfo: (() => void) | null = null;

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
        this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
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
        if (this.unsubscribeNetInfo) {
            this.unsubscribeNetInfo();
            this.unsubscribeNetInfo = null;
        }
    }

    async syncPendingUploads(): Promise<void> {
        if (this.isSyncing) {
            return;
        }

        // Use utility for connection check
        const isConnected = await checkInternetConnection();
        if (!isConnected) {
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

    async waitForConnectionAndSync(timeoutMs: number = 30000): Promise<boolean> {
        // Use utility for waiting
        const connected = await waitForConnection(timeoutMs);
        if (connected) {
            await this.syncPendingUploads();
        }
        return connected;
    }

    async getPendingCount(): Promise<number> {
        const pending = await storageService.getPendingCaptures();
        return pending.length;
    }
}

export const syncService = new SyncService();