import { Request, Response, NextFunction } from 'express';
import { Capture } from '../models/Capture.model';
import { r2Service } from '../services/r2.service';
import { kafkaService } from '../services/kafka.service';
import { ApiError } from '../utils/error';
import { logger } from '../utils/logger';

export const captureController = {
    async upload(req: Request, res: Response, next: NextFunction) {
        try {
            const { captureData, imageBase64 } = req.body;
            const userId = (req as any).user.userId;

            // Validate capture data
            if (!captureData || !imageBase64) {
                throw new ApiError(400, 'Missing required fields');
            }

            // Upload image to R2
            const imageBuffer = Buffer.from(imageBase64, 'base64');
            const imageKey = `captures/${userId}/${captureData.id}.jpg`;

            const { url: imageUrl } = await r2Service.uploadImage(
                imageKey,
                imageBuffer,
                'image/jpeg'
            );

            // Use dimensions from captureData if available, otherwise use defaults
            const width = captureData.cameraMetadata?.resolution?.width || 4032;
            const height = captureData.cameraMetadata?.resolution?.height || 3024;

            // Create capture record
            const capture = await Capture.create({
                userId,
                captureId: captureData.id,
                timestamp: captureData.timestamp,
                imageUrl,
                imageKey,
                imageSize: imageBuffer.length,
                imageWidth: width,
                imageHeight: height,
                concentration: captureData.concentration,
                concentrationBatchId: captureData.concentrationBatchId || null,
                cameraMetadata: captureData.cameraMetadata,
                exifData: captureData.exifData,
                sensorData: captureData.sensorData,
                analysisData: captureData.analysisData,
                deviceInfo: captureData.deviceInfo,
                captureMode: captureData.captureMode,
                status: 'uploaded',
                notes: captureData.notes,
            });

            // Send to Kafka for async processing
            await kafkaService.sendCaptureEvent({
                captureId: capture.captureId,
                userId: userId,
                imageUrl,
                timestamp: capture.timestamp.toISOString(),
            });

            logger.info(`Capture uploaded: ${capture.captureId}`);

            res.status(201).json({
                success: true,
                data: {
                    captureId: capture.captureId,
                    imageUrl,
                    uploadedAt: capture.createdAt,
                },
            });
        } catch (error) {
            logger.error('Upload error:', error);
            next(error);
        }
    },

    async getCapture(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;

            const capture = await Capture.findOne({ captureId: id, userId })
                .populate('concentrationBatchId');

            if (!capture) {
                throw new ApiError(404, 'Capture not found');
            }

            res.json({
                success: true,
                data: capture,
            });
        } catch (error) {
            next(error);
        }
    },

    async listCaptures(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.userId;
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.pageSize as string) || 20;
            const skip = (page - 1) * pageSize;

            const [captures, total] = await Promise.all([
                Capture.find({ userId })
                    .sort({ timestamp: -1 })
                    .skip(skip)
                    .limit(pageSize)
                    .populate('concentrationBatchId'),
                Capture.countDocuments({ userId }),
            ]);

            res.json({
                success: true,
                data: {
                    items: captures,
                    total,
                    page,
                    pageSize,
                    hasMore: skip + captures.length < total,
                },
            });
        } catch (error) {
            next(error);
        }
    },

    async deleteCapture(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;

            const capture = await Capture.findOne({ captureId: id, userId });
            if (!capture) {
                throw new ApiError(404, 'Capture not found');
            }

            // Delete from R2
            await r2Service.deleteImage(capture.imageKey);

            // Delete from database
            await capture.deleteOne();

            logger.info(`Capture deleted: ${id}`);

            res.json({
                success: true,
                message: 'Capture deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    },
};