import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/error';
import { logger } from '../utils/logger';

export const errorMiddleware = (
    error: Error | ApiError,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
): void => {
    logger.error('Error:', error);

    if (error instanceof ApiError) {
        res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
                statusCode: error.statusCode,
            },
        });
        return;
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.message,
                statusCode: 400,
            },
        });
        return;
    }

    // Handle Mongoose duplicate key errors
    if (error.name === 'MongoServerError' && (error as any).code === 11000) {
        res.status(400).json({
            success: false,
            error: {
                code: 'DUPLICATE_KEY',
                message: 'Resource already exists',
                statusCode: 400,
            },
        });
        return;
    }

    // Default error
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            statusCode: 500,
        },
    });
};