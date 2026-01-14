import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.model';
import { ApiError } from '../utils/error';

export const userController = {
    async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const user = await User.findById(userId).select('-password');

            if (!user) {
                throw new ApiError(404, 'User not found');
            }

            res.json({
                success: true,
                data: user,
            });
        } catch (error) {
            next(error);
        }
    },

    async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const { name } = req.body;

            const user = await User.findByIdAndUpdate(
                userId,
                { name },
                { new: true, runValidators: true }
            ).select('-password');

            if (!user) {
                throw new ApiError(404, 'User not found');
            }

            res.json({
                success: true,
                data: user,
            });
        } catch (error) {
            next(error);
        }
    },


};