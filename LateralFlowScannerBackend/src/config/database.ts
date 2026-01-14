import mongoose from 'mongoose';
import { config } from './env';
import { logger } from '../utils/logger';

export const connectDatabase = async (): Promise<void> => {
    try {
        await mongoose.connect(config.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        mongoose.connection.on('error', (error) => {
            logger.error('MongoDB connection error:', error);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        logger.info('MongoDB connected successfully');
    } catch (error) {
        logger.error('Failed to connect to MongoDB:', error);
        throw error;
    }
};