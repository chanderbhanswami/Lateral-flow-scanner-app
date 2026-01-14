import { z } from 'zod';

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
    }),
});

export const changePasswordSchema = z.object({
    body: z.object({
        oldPassword: z.string().min(1, 'Old password is required'),
        newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    }),
});
