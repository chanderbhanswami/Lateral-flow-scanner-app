import { z } from 'zod';

export const captureDataSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    timestamp: z.string().datetime(),
    imageUrl: z.string().url().optional(),
    imageKey: z.string(),
    imageSize: z.number().positive(),
    imageWidth: z.number().positive(),
    imageHeight: z.number().positive(),
    concentration: z.string().min(1),
    concentrationBatchId: z.string().optional(),
    cameraMetadata: z.any(),
    exifData: z.any(),
    sensorData: z.any(),
    analysisData: z.any(),
    deviceInfo: z.any(),
    captureMode: z.enum(['auto', 'manual']),
    status: z.enum(['pending', 'uploaded', 'processed', 'failed']),
    notes: z.string().optional(),
});