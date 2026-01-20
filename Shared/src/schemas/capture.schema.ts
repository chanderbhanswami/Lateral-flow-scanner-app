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
    cassetteId: z.string().optional(),
    lotNumber: z.string().optional(),
    qrCode: z.string().optional(),
    detectionMetadata: z.object({
        engine: z.enum(['NATIVE_CPP_JSI', 'JS_FALLBACK', 'HYBRID', 'UNKNOWN']),
        algorithms: z.array(z.string()), // e.g., ["PROBABILISTIC_HOUGH", "ROBUST_WELSCH_FITTING", "CANNY", "KALMAN_FILTER"]
        parameters: z.record(z.string(), z.any()).optional(), // e.g., { houghVotes: 20, ransacThreshold: "DIST_WELSCH" }
        performance: z.record(z.string(), z.number()).optional(), // e.g., { processingTimeMs: 45 }
        version: z.string().optional()
    }).optional(),
    captureMode: z.enum(['auto', 'manual']),
    status: z.enum(['pending', 'uploaded', 'processed', 'failed']),
    notes: z.string().optional(),
});


