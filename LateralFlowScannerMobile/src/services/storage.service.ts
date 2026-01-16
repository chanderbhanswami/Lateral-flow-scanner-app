import AsyncStorage from '@react-native-async-storage/async-storage';
import { CaptureData } from '../types';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';

// Token keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const PENDING_CAPTURES_KEY = 'pendingCaptures';

class StorageService {
    // Token management - using AsyncStorage for reliability
    async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
        await AsyncStorage.multiSet([
            [ACCESS_TOKEN_KEY, accessToken],
            [REFRESH_TOKEN_KEY, refreshToken],
        ]);
        logger.debug('Tokens saved');
    }

    async getAccessToken(): Promise<string | null> {
        return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    }

    async getRefreshToken(): Promise<string | null> {
        return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    }

    async clearTokens(): Promise<void> {
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
        logger.debug('Tokens cleared');
    }

    // Capture management - using cache utility for TTL support
    async saveCaptureLocally(captureData: CaptureData): Promise<void> {
        const key = `capture_${captureData.id}`;
        // Use cache utility with 7-day TTL
        await cache.set(key, captureData, 7 * 24 * 60 * 60);
    }

    async getCaptureLocally(captureId: string): Promise<CaptureData | null> {
        const key = `capture_${captureId}`;
        return await cache.get<CaptureData>(key);
    }

    async savePendingCapture(captureData: CaptureData, imageUri: string): Promise<void> {
        const pending = await this.getPendingCaptures();
        // Prevent duplicates
        if (!pending.some(item => item.captureData.id === captureData.id)) {
            pending.push({ captureData, imageUri });
            await AsyncStorage.setItem(PENDING_CAPTURES_KEY, JSON.stringify(pending));
            logger.info('Pending capture saved', { id: captureData.id });
        }
    }

    async getPendingCaptures(): Promise<Array<{ captureData: CaptureData; imageUri: string }>> {
        const data = await AsyncStorage.getItem(PENDING_CAPTURES_KEY);
        return data ? JSON.parse(data) : [];
    }

    async removePendingCapture(captureId: string): Promise<void> {
        const pending = await this.getPendingCaptures();
        const filtered = pending.filter(item => item.captureData.id !== captureId);
        await AsyncStorage.setItem(PENDING_CAPTURES_KEY, JSON.stringify(filtered));
        logger.debug('Pending capture removed', { id: captureId });
    }

    async clearAllPendingCaptures(): Promise<void> {
        await AsyncStorage.removeItem(PENDING_CAPTURES_KEY);
        logger.info('All pending captures cleared');
    }

    // Settings - using cache utility
    async saveSetting(key: string, value: any): Promise<void> {
        await cache.set(`setting_${key}`, value);
    }

    async getSetting<T>(key: string): Promise<T | null> {
        return await cache.get<T>(`setting_${key}`);
    }

    async hasSetting(key: string): Promise<boolean> {
        return await cache.has(`setting_${key}`);
    }

    async clearSetting(key: string): Promise<void> {
        await cache.delete(`setting_${key}`);
    }

    // Cache management
    async getCacheKeys(): Promise<readonly string[]> {
        return await cache.keys();
    }

    async clearAllCache(): Promise<void> {
        await cache.clear();
        logger.warn('All cache cleared');
    }
}

export const storageService = new StorageService();
