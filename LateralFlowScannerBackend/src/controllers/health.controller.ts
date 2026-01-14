import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis';

export const healthController = {
    async check(req: Request, res: Response) {
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: {
                database: 'unknown',
                redis: 'unknown',
            },
        };

        // Check MongoDB
        try {
            if (mongoose.connection.readyState === 1) {
                health.services.database = 'connected';
            } else {
                health.services.database = 'disconnected';
                health.status = 'degraded';
            }
        } catch (error) {
            health.services.database = 'error';
            health.status = 'degraded';
        }

        // Check Redis
        try {
            const redis = getRedisClient();
            await redis.ping();
            health.services.redis = 'connected';
        } catch (error) {
            health.services.redis = 'error';
            health.status = 'degraded';
        }

        const statusCode = health.status === 'ok' ? 200 : 503;
        res.status(statusCode).json(health);
    },
};