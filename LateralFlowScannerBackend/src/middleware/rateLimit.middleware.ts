import rateLimit from 'express-rate-limit';
import { getRedisClient } from '../config/redis';

export const createRateLimiter = (options: {
    windowMs?: number;
    max?: number;
    message?: string;
}) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
        max: options.max || 100,
        message: options.message || 'Too many requests',
        standardHeaders: true,
        legacyHeaders: false,
    });
};

export const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts',
});

export const uploadLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many upload requests',
});