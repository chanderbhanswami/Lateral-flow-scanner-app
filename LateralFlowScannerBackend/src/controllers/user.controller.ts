import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.model';
import { ApiError } from '../utils/error';
import { uploadImage, deleteImage, getPublicIdFromUrl } from '../config/cloudinary';
import fs from 'fs';

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
            const { name, settings } = req.body;

            const updateData: any = {};
            if (name) updateData.name = name;
            if (settings) updateData.settings = settings;

            const user = await User.findByIdAndUpdate(
                userId,
                updateData,
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

    async uploadAvatar(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.file) {
                throw new ApiError(400, 'No image file provided');
            }

            const userId = (req as any).user.userId;
            const user = await User.findById(userId);

            if (!user) {
                // If user not found, clean up uploaded file
                fs.unlinkSync(req.file.path);
                throw new ApiError(404, 'User not found');
            }

            // 1. If user already has an avatar, delete it from Cloudinary
            if (user.avatar) {
                const publicId = getPublicIdFromUrl(user.avatar);
                if (publicId) {
                    await deleteImage(publicId);
                }
            }

            // 2. Upload new image to Cloudinary
            const result = await uploadImage(req.file.path, 'profiles');

            // 3. Update user profile
            user.avatar = result.secure_url;
            await user.save();

            res.json({
                success: true,
                message: 'Avatar updated successfully',
                data: {
                    avatar: user.avatar
                }
            });
        } catch (error) {
            // Clean up file if still exists
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            next(error);
        }
    },

    async deleteAvatar(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const user = await User.findById(userId);

            if (!user) {
                throw new ApiError(404, 'User not found');
            }

            if (user.avatar) {
                const publicId = getPublicIdFromUrl(user.avatar);
                if (publicId) {
                    await deleteImage(publicId);
                }

                user.avatar = undefined;
                await user.save();
            }

            res.json({
                success: true,
                message: 'Avatar removed successfully'
            });
        } catch (error) {
            next(error);
        }
    }


};