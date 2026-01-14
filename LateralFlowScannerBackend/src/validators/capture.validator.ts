import { z } from 'zod';

export const uploadSchema = z.object({
    body: z.object({
        captureData: z.object({
            id: z.string().uuid(),
            timestamp: z.string(),
            concentration: z.string().min(1),
            concentrationBatchId: z.string().optional(),
            cameraMetadata: z.any(),
            exifData: z.any(),
            sensorData: z.any(),
            analysisData: z.any(),
            deviceInfo: z.any(),
            captureMode: z.enum(['auto', 'manual']),
            notes: z.string().optional(),
        }),
        imageBase64: z.string().min(1),
    }),
});