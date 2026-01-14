import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

class RedisService {
    async get(key: string): Promise<string | null> {
        try {
            const redis = getRedisClient();
            return await redis.get(key);
        } catch (error) {
            logger.error('Redis get error:', error);
            return null;
        }
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        try {
            const redis = getRedisClient();
            if (ttl) {
                await redis.setex(key, ttl, value);
            } else {
                await redis.set(key, value);
            }
        } catch (error) {
            logger.error('Redis set error:', error);
        }
    }

    async delete(key: string): Promise<void> {
        try {
            const redis = getRedisClient();
            await redis.del(key);
        } catch (error) {
            logger.error('Redis delete error:', error);
        }
    }

    async cacheGet<T>(key: string): Promise<T | null> {
        try {
            const data = await this.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            logger.error('Cache get error:', error);
            return null;
        }
    }

    async cacheSet<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
        try {
            await this.set(key, JSON.stringify(value), ttl);
        } catch (error) {
            logger.error('Cache set error:', error);
        }
    }
}

export const redisService = new RedisService();