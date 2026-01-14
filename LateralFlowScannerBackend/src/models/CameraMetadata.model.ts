import mongoose, { Document, Schema } from 'mongoose';

// Define the data properties separately (without extending Document)
export interface ICameraMetadataData {
    captureId: string;
    make: string;
    model: string;
    lensModel: string;
    focalLength: number;
    focalLengthIn35mm: number;
    aperture: number;
    iso: number;
    exposureTime: number;
    whiteBalance: number;
    flash: boolean;
    digitalZoom: number;
    opticalZoom: number;
    focusMode: string;
    focusDistance?: number;
    exposureMode: string;
    exposureBias: number;
    meteringMode: string;
    sceneCaptureType: string;
    contrast: number;
    saturation: number;
    sharpness: number;
    brightnessValue: number;
    lightSource: string;
    timestamp: Date;
    createdAt: Date;
}

// Combine with Document for the full Mongoose document type
export type ICameraMetadata = ICameraMetadataData & Document;

const CameraMetadataSchema = new Schema<ICameraMetadataData>(
    {
        captureId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        make: {
            type: String,
            required: true,
        },
        model: {
            type: String,
            required: true,
        },
        lensModel: {
            type: String,
            default: 'Unknown',
        },
        focalLength: {
            type: Number,
            default: 0,
        },
        focalLengthIn35mm: {
            type: Number,
            default: 0,
        },
        aperture: {
            type: Number,
            default: 0,
        },
        iso: {
            type: Number,
            default: 0,
        },
        exposureTime: {
            type: Number,
            default: 0,
        },
        whiteBalance: {
            type: Number,
            default: 0,
        },
        flash: {
            type: Boolean,
            default: false,
        },
        digitalZoom: {
            type: Number,
            default: 1.0,
        },
        opticalZoom: {
            type: Number,
            default: 1.0,
        },
        focusMode: {
            type: String,
            enum: ['auto', 'manual', 'macro', 'infinity'],
            default: 'auto',
        },
        focusDistance: {
            type: Number,
        },
        exposureMode: {
            type: String,
            enum: ['auto', 'manual', 'program', 'aperture-priority', 'shutter-priority'],
            default: 'auto',
        },
        exposureBias: {
            type: Number,
            default: 0,
        },
        meteringMode: {
            type: String,
            enum: ['average', 'center-weighted', 'spot', 'multi-spot', 'pattern'],
            default: 'pattern',
        },
        sceneCaptureType: {
            type: String,
            enum: ['standard', 'landscape', 'portrait', 'night'],
            default: 'standard',
        },
        contrast: {
            type: Number,
            default: 0,
        },
        saturation: {
            type: Number,
            default: 0,
        },
        sharpness: {
            type: Number,
            default: 0,
        },
        brightnessValue: {
            type: Number,
            default: 0,
        },
        lightSource: {
            type: String,
            enum: ['unknown', 'daylight', 'fluorescent', 'tungsten', 'flash', 'cloudy', 'shade'],
            default: 'unknown',
        },
        timestamp: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Indexes
CameraMetadataSchema.index({ captureId: 1 });
CameraMetadataSchema.index({ make: 1, model: 1 });
CameraMetadataSchema.index({ timestamp: -1 });

export const CameraMetadata = mongoose.model<ICameraMetadataData>('CameraMetadata', CameraMetadataSchema);
