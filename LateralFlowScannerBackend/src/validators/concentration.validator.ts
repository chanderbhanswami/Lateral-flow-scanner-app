import { z } from 'zod';

export const createConcentrationSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
        concentration: z.string().min(1, 'Concentration is required').max(50, 'Concentration too long'),
        unit: z.string().min(1, 'Unit is required').max(20, 'Unit too long'),
        description: z.string().max(500, 'Description too long').optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
    }),
});

export const updateConcentrationSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'ID is required'),
    }),
    body: z.object({
        name: z.string().min(1).max(100).optional(),
        concentration: z.string().min(1).max(50).optional(),
        unit: z.string().min(1).max(20).optional(),
        description: z.string().max(500).optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    }),
});

export const deleteConcentrationSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'ID is required'),
    }),
});