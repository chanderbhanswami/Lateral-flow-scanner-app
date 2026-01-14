import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ApiError } from '../utils/error';

export const validateRequest = (schema: z.ZodType<{ body?: unknown; query?: unknown; params?: unknown }>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));
                next(new ApiError(400, 'Validation failed', 'VALIDATION_ERROR'));
            } else {
                next(error);
            }
        }
    };
};