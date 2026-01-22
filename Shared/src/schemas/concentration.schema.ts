import { z } from 'zod';

export const concentrationBatchSchema = z.object({
    name: z.string().min(1).max(100),
    concentration: z.string().min(1).max(50),
    unit: z.string().min(1).max(20),
    notes: z.string().optional(),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

export type ConcentrationBatchInput = z.infer<typeof concentrationBatchSchema>;

export interface ConcentrationBatch extends ConcentrationBatchInput {
    id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
}
