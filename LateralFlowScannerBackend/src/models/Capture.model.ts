import mongoose, { Document, Schema } from 'mongoose';
import {
    CameraMetadata,
    ExifData,
    SensorData,
    ImageAnalysisData,
    DeviceInfo
} from '@lateralflowscanner/shared';

export interface ICapture extends Document {
    userId: mongoose.Types.ObjectId;
    captureId: string;
    timestamp: Date;
    imageUrl: string;
    imageKey: string;
    imageSize: number;
    imageWidth: number;
    imageHeight: number;
    concentration: string;
    concentrationBatchId?: mongoose.Types.ObjectId;
    cameraMetadata: CameraMetadata;
    exifData: ExifData;
    sensorData: SensorData;
    analysisData: ImageAnalysisData;
    deviceInfo: DeviceInfo;
    captureMode: 'auto' | 'manual';
    status: 'pending' | 'uploaded' | 'processed' | 'failed';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CaptureSchema = new Schema<ICapture>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        captureId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        timestamp: {
            type: Date,
            required: true,
            index: true,
        },
        imageUrl: {
            type: String,
            required: true,
        },
        imageKey: {
            type: String,
            required: true,
        },
        imageSize: {
            type: Number,
            required: true,
        },
        imageWidth: {
            type: Number,
            required: true,
        },
        imageHeight: {
            type: Number,
            required: true,
        },
        concentration: {
            type: String,
            required: true,
        },
        concentrationBatchId: {
            type: Schema.Types.ObjectId,
            ref: 'ConcentrationBatch',
        },
        cameraMetadata: {
            type: Schema.Types.Mixed,
            required: true,
        },
        exifData: {
            type: Schema.Types.Mixed,
            required: true,
        },
        sensorData: {
            type: Schema.Types.Mixed,
            required: true,
        },
        analysisData: {
            type: Schema.Types.Mixed,
            required: true,
        },
        deviceInfo: {
            type: Schema.Types.Mixed,
            required: true,
        },
        captureMode: {
            type: String,
            enum: ['auto', 'manual'],
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'uploaded', 'processed', 'failed'],
            default: 'uploaded',
            index: true,
        },
        notes: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

CaptureSchema.index({ userId: 1, timestamp: -1 });
CaptureSchema.index({ status: 1, createdAt: -1 });

export const Capture = mongoose.model<ICapture>('Capture', CaptureSchema);