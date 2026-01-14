import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { uploadService } from './upload.service';

class NetworkService {
    private isConnected: boolean | null = true;
    private unsubscribe: (() => void) | null = null;

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

    private handleConnectivityChange(state: NetInfoState) {
        const wasConnected = this.isConnected;
        this.isConnected = state.isConnected;

        console.log(`[NetworkService] Connectivity changed: ${wasConnected} -> ${this.isConnected}`);

        // If we just came online, trigger retry logic
        if (!wasConnected && this.isConnected) {
            console.log('[NetworkService] Connection restored. Retrying pending uploads...');
            uploadService.retryPendingUploads().catch(err => {
                console.error('[NetworkService] Failed to retry uploads:', err);
            });
        }
    }

    getIsConnected(): boolean {
        return !!this.isConnected;
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}

export const networkService = new NetworkService();
