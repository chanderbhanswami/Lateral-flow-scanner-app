import { Capture, ICapture } from '../models/Capture.model';
import { CameraMetadata } from '../models/CameraMetadata.model';
import { r2Service } from './r2.service';
import { kafkaService } from './kafka.service';
import { ApiError } from '../utils/error';
import { logger } from '../utils/logger';

export class CaptureService {
    async createCapture(data: {
        userId: string;
        captureData: any;
        imageBuffer: Buffer;
    }): Promise<ICapture> {
        try {
            const { userId, captureData, imageBuffer } = data;

            // Upload image to R2
            const imageKey = `captures/${userId}/${captureData.id}.jpg`;
            const { url: imageUrl } = await r2Service.uploadImage(
                imageKey,
                imageBuffer,
                'image/jpeg'
            );

            // Create capture record
            const capture = await Capture.create({
                userId,
                captureId: captureData.id,
                timestamp: new Date(captureData.timestamp),
                imageUrl,
                imageKey,
                imageSize: imageBuffer.length,
                imageWidth: captureData.imageWidth || 0,
                imageHeight: captureData.imageHeight || 0,
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

            // Save camera metadata separately
            if (captureData.cameraMetadata) {
                await CameraMetadata.create({
                    captureId: captureData.id,
                    ...captureData.cameraMetadata,
                    timestamp: new Date(captureData.timestamp),
                });
            }

            // Send to Kafka for async processing
            await kafkaService.sendCaptureEvent({
                captureId: capture.captureId,
                userId: userId,
                imageUrl,
                timestamp: capture.timestamp.toISOString(),
            });

            logger.info(`Capture created: ${capture.captureId}`);

            return capture;
        } catch (error) {
            logger.error('Create capture error:', error);
            throw error;
        }
    }

    async getCapture(captureId: string, userId: string): Promise<ICapture> {
        try {
            const capture = await Capture.findOne({ captureId, userId })
                .populate('concentrationBatchId');

            if (!capture) {
                throw new ApiError(404, 'Capture not found', 'CAPTURE_NOT_FOUND');
            }

            return capture;
        } catch (error) {
            logger.error('Get capture error:', error);
            throw error;
        }
    }

    async listCaptures(
        userId: string,
        page: number = 1,
        pageSize: number = 20
    ): Promise<{
        items: ICapture[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
    }> {
        try {
            const skip = (page - 1) * pageSize;

            const [captures, total] = await Promise.all([
                Capture.find({ userId })
                    .sort({ timestamp: -1 })
                    .skip(skip)
                    .limit(pageSize)
                    .populate('concentrationBatchId')
                    .lean(),
                Capture.countDocuments({ userId }),
            ]);

            return {
                items: captures as ICapture[],
                total,
                page,
                pageSize,
                hasMore: skip + captures.length < total,
            };
        } catch (error) {
            logger.error('List captures error:', error);
            throw error;
        }
    }

    async updateCapture(
        captureId: string,
        userId: string,
        updates: Partial<ICapture>
    ): Promise<ICapture> {
        try {
            const capture = await Capture.findOneAndUpdate(
                { captureId, userId },
                updates,
                { new: true, runValidators: true }
            ).populate('concentrationBatchId');

            if (!capture) {
                throw new ApiError(404, 'Capture not found', 'CAPTURE_NOT_FOUND');
            }

            logger.info(`Capture updated: ${captureId}`);

            return capture;
        } catch (error) {
            logger.error('Update capture error:', error);
            throw error;
        }
    }

    async deleteCapture(captureId: string, userId: string): Promise<void> {
        try {
            const capture = await Capture.findOne({ captureId, userId });

            if (!capture) {
                throw new ApiError(404, 'Capture not found', 'CAPTURE_NOT_FOUND');
            }

            // Delete from R2
            await r2Service.deleteImage(capture.imageKey);

            // Delete camera metadata
            await CameraMetadata.deleteOne({ captureId });

            // Delete capture record
            await capture.deleteOne();

            logger.info(`Capture deleted: ${captureId}`);
        } catch (error) {
            logger.error('Delete capture error:', error);
            throw error;
        }
    }

    async getCapturesByDateRange(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<ICapture[]> {
        try {
            const captures = await Capture.find({
                userId,
                timestamp: {
                    $gte: startDate,
                    $lte: endDate,
                },
            })
                .sort({ timestamp: -1 })
                .populate('concentrationBatchId')
                .lean();

            return captures as ICapture[];
        } catch (error) {
            logger.error('Get captures by date range error:', error);
            throw error;
        }
    }

    async getCaptureStats(userId: string): Promise<{
        totalCaptures: number;
        autoCaptures: number;
        manualCaptures: number;
        averageQualityScore: number;
        capturesByStatus: Record<string, number>;
    }> {
        try {
            const [
                totalCaptures,
                autoCaptures,
                manualCaptures,
                qualityScores,
                statusCounts,
            ] = await Promise.all([
                Capture.countDocuments({ userId }),
                Capture.countDocuments({ userId, captureMode: 'auto' }),
                Capture.countDocuments({ userId, captureMode: 'manual' }),
                Capture.find({ userId }).select('analysisData.qualityScore').lean(),
                Capture.aggregate([
                    { $match: { userId } },
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ]),
            ]);

            const avgQuality =
                qualityScores.length > 0
                    ? qualityScores.reduce(
                        (sum, c: any) => sum + (c.analysisData?.qualityScore || 0),
                        0
                    ) / qualityScores.length
                    : 0;

            const capturesByStatus: Record<string, number> = {};
            statusCounts.forEach((s: any) => {
                capturesByStatus[s._id] = s.count;
            });

            return {
                totalCaptures,
                autoCaptures,
                manualCaptures,
                averageQualityScore: avgQuality,
                capturesByStatus,
            };
        } catch (error) {
            logger.error('Get capture stats error:', error);
            throw error;
        }
    }
}

export const captureService = new CaptureService();