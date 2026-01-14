import { Request, Response, NextFunction } from 'express';
import { ConcentrationBatch } from '../models/ConcentrationBatch.model';
import { ApiError } from '../utils/error';

export const concentrationController = {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const { name, concentration, unit, description, color } = req.body;

            const batch = await ConcentrationBatch.create({
                userId,
                name,
                concentration,
                unit,
                description,
                color,
            });

            res.status(201).json({
                success: true,
                data: batch,
            });
        } catch (error) {
            next(error);
        }
    },

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;
            const updates = req.body;

            const batch = await ConcentrationBatch.findOneAndUpdate(
                { _id: id, userId },
                updates,
                { new: true, runValidators: true }
            );

            if (!batch) {
                throw new ApiError(404, 'Batch not found');
            }

            res.json({
                success: true,
                data: batch,
            });
        } catch (error) {
            next(error);
        }
    },

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;

            const batch = await ConcentrationBatch.findOneAndDelete({ _id: id, userId });

            if (!batch) {
                throw new ApiError(404, 'Batch not found');
            }

            res.json({
                success: true,
                message: 'Batch deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    },

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;

            const batches = await ConcentrationBatch.find({ userId, isActive: true }).sort({
                createdAt: -1,
            });

            res.json({
                success: true,
                data: batches,
            });
        } catch (error) {
            next(error);
        }
    },
};