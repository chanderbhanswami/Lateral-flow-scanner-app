import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
    userId: mongoose.Types.ObjectId;
    title: string;
    body: string;
    type: 'info' | 'warning' | 'success' | 'error';
    read: boolean;
    data?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        body: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['info', 'warning', 'success', 'error'],
            default: 'info',
        },
        read: {
            type: Boolean,
            default: false,
            index: true,
        },
        data: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
