import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import { CaptureData } from '../types';

// Lazy initialization to avoid issues during module loading
let storage: MMKV | null = null;

function getStorage(): MMKV {
    if (!storage) {
        storage = new MMKV({ id: 'default' });
    }
    return storage;
}

class StorageService {
    // Token management
    async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
        getStorage().set('accessToken', accessToken);
        getStorage().set('refreshToken', refreshToken);
    }

    getAccessToken(): string | undefined {
        return getStorage().getString('accessToken');
    }

    getRefreshToken(): string | undefined {
        return getStorage().getString('refreshToken');
    }

    async clearTokens(): Promise<void> {
        getStorage().delete('accessToken');
        getStorage().delete('refreshToken');
    }

    // Capture management
    async saveCaptureLocally(captureData: CaptureData): Promise<void> {
        const key = `capture_${captureData.id}`;
        getStorage().set(key, JSON.stringify(captureData));
    }

    async savePendingCapture(captureData: CaptureData, imageUri: string): Promise<void> {
        const pending = await this.getPendingCaptures();
        // Prevent duplicates
        if (!pending.some(item => item.captureData.id === captureData.id)) {
            pending.push({ captureData, imageUri });
            await AsyncStorage.setItem('pendingCaptures', JSON.stringify(pending));
        }
    }

    async getPendingCaptures(): Promise<Array<{ captureData: CaptureData; imageUri: string }>> {
        const data = await AsyncStorage.getItem('pendingCaptures');
        return data ? JSON.parse(data) : [];
    }

    async removePendingCapture(captureId: string): Promise<void> {
        const pending = await this.getPendingCaptures();
        const filtered = pending.filter(item => item.captureData.id !== captureId);
        await AsyncStorage.setItem('pendingCaptures', JSON.stringify(filtered));
    }

    // Settings
    async saveSetting(key: string, value: any): Promise<void> {
        getStorage().set(key, JSON.stringify(value));
    }

    getSetting(key: string): any {
        const value = getStorage().getString(key);
        return value ? JSON.parse(value) : null;
    }
}

export const storageService = new StorageService();
