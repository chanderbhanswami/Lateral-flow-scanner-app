import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { uploadService } from './upload.service';
import { logger } from '../utils/logger';
import { checkInternetConnection, getConnectionQuality } from '../utils/network';

class NetworkService {
    private isConnected: boolean | null = true;
    private unsubscribe: (() => void) | null = null;
    private connectionQuality: 'excellent' | 'good' | 'poor' | 'none' = 'good';

    initialize() {
        if (this.unsubscribe) {
            return;
        }

        this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            this.handleConnectivityChange(state);
        });

        // Check initial state
        NetInfo.fetch().then(state => {
            this.handleConnectivityChange(state);
        });
    }

    private async handleConnectivityChange(state: NetInfoState) {
        const wasConnected = this.isConnected;
        this.isConnected = state.isConnected;

        // Use utility for connection quality
        this.connectionQuality = await getConnectionQuality();

        logger.info('Connectivity changed', {
            wasConnected,
            isConnected: this.isConnected,
            quality: this.connectionQuality
        });

        // If we just came online, trigger retry logic
        if (!wasConnected && this.isConnected) {
            logger.info('Connection restored. Retrying pending uploads...');
            uploadService.retryPendingUploads().catch(err => {
                logger.error('Failed to retry uploads', err);
            });
        }
    }

    getIsConnected(): boolean {
        return !!this.isConnected;
    }

    getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'none' {
        return this.connectionQuality;
    }

    async checkConnection(): Promise<boolean> {
        // Use utility
        return await checkInternetConnection();
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}

export const networkService = new NetworkService();
