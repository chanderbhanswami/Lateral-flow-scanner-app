import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheItem<T> {
    value: T;
    expiry: number | null;
}

class CacheService {
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        const item: CacheItem<T> = {
            value,
            expiry: ttl ? Date.now() + ttl * 1000 : null,
        };

        await AsyncStorage.setItem(key, JSON.stringify(item));
    }

    async get<T>(key: string): Promise<T | null> {
        const itemStr = await AsyncStorage.getItem(key);

        if (!itemStr) {
            return null;
        }

        const item: CacheItem<T> = JSON.parse(itemStr);

        if (item.expiry && Date.now() > item.expiry) {
            await this.delete(key);
            return null;
        }

        return item.value;
    }

    async delete(key: string): Promise<void> {
        await AsyncStorage.removeItem(key);
    }

    async clear(): Promise<void> {
        await AsyncStorage.clear();
    }

    async has(key: string): Promise<boolean> {
        const value = await this.get(key);
        return value !== null;
    }

    async keys(): Promise<readonly string[]> {
        return await AsyncStorage.getAllKeys();
    }
}

export const cache = new CacheService();
