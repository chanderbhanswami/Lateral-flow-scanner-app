import { z } from 'zod';

export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
    return schema.parse(data);
};

export const validateDataSafe = <T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } => {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    } else {
        return { success: false, error: result.error };
    }
};