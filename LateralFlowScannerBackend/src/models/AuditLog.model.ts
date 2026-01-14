import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
    userId: mongoose.Types.ObjectId;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        action: {
            type: String,
            required: true,
            enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'UPLOAD'],
            index: true,
        },
        resource: {
            type: String,
            required: true,
            index: true,
        },
        resourceId: {
            type: String,
            index: true,
        },
        details: {
            type: Schema.Types.Mixed,
        },
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: false,
    }
);

// Create indexes
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);