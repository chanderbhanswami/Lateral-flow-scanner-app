import mongoose, { Document, Schema } from 'mongoose';

export interface IConcentrationBatch extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    concentration: string;
    unit: string;
    description?: string;
    color?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ConcentrationBatchSchema = new Schema<IConcentrationBatch>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        concentration: {
            type: String,
            required: true,
            trim: true,
        },
        unit: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        color: {
            type: String,
            match: /^#[0-9A-F]{6}$/i,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

ConcentrationBatchSchema.index({ userId: 1, isActive: 1 });

export const ConcentrationBatch = mongoose.model<IConcentrationBatch>(
    'ConcentrationBatch',
    ConcentrationBatchSchema
);