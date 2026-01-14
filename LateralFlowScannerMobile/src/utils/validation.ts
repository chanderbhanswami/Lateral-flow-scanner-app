import { z } from 'zod';
import { VALIDATION_CONSTANTS } from '../constants';

export const captureSchema = z.object({
    concentration: z.string().min(VALIDATION_CONSTANTS.CONCENTRATION.MIN_LENGTH),
    notes: z.string().max(VALIDATION_CONSTANTS.NOTES.MAX_LENGTH).optional(),
});

export const concentrationBatchSchema = z.object({
    name: z.string().min(1).max(100),
    concentration: z.string().min(1).max(50),
    unit: z.string().min(1).max(20),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

export const validateCaptureData = (data: any) => {
    return captureSchema.safeParse(data);
};

export const validateConcentrationBatch = (data: any) => {
    return concentrationBatchSchema.safeParse(data);
};