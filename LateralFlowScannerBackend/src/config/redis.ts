import Redis from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

let redis: Redis;

export const connectRedis = async (): Promise<Redis> => {
    try {
        redis = new Redis(config.REDIS_URL, {
            maxRetriesPerRequest: null, // Required by BullMQ
            enableReadyCheck: true,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        redis.on('error', (error) => {
            logger.error('Redis error:', error);
        });

        redis.on('connect', () => {
            logger.info('Redis connected');
        });

        return redis;
    } catch (error) {
        logger.error('Failed to connect to Redis:', error);
        throw error;
    }
};

export const getRedisClient = (): Redis => {
    if (!redis) {
        throw new Error('Redis not initialized');
    }
    return redis;
};