import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { ApiError } from '../utils/error';

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(401, 'No token provided');
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
            (req as any).user = decoded;
            next();
        } catch (error) {
            throw new ApiError(401, 'Invalid token');
        }
    } catch (error) {
        next(error);
    }
};