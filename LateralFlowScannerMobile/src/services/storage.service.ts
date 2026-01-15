import AsyncStorage from '@react-native-async-storage/async-storage';
import { CaptureData } from '../types';

// Token keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

class StorageService {
    // Token management - using AsyncStorage for reliability
    async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
        await AsyncStorage.multiSet([
            [ACCESS_TOKEN_KEY, accessToken],
            [REFRESH_TOKEN_KEY, refreshToken],
        ]);
    }

    async getAccessToken(): Promise<string | null> {
        return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    }

    async getRefreshToken(): Promise<string | null> {
        return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    }

    async clearTokens(): Promise<void> {
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
    }

    // Capture management
    async saveCaptureLocally(captureData: CaptureData): Promise<void> {
        const key = `capture_${captureData.id}`;
        await AsyncStorage.setItem(key, JSON.stringify(captureData));
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
        await AsyncStorage.setItem(key, JSON.stringify(value));
    }

    async getSetting(key: string): Promise<any> {
        const value = await AsyncStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    }
}

export const storageService = new StorageService();
