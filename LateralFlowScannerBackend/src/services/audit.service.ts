import { AuditLog } from '../models/AuditLog.model';
import { logger } from '../utils/logger';

export class AuditService {
    async log(data: {
        userId: string;
        action: string;
        resource: string;
        resourceId?: string;
        details?: any;
        ipAddress?: string | string[];
        userAgent?: string | string[];
    }): Promise<void> {
        try {
            // Normalize array values to strings
            const normalizedData = {
                ...data,
                ipAddress: Array.isArray(data.ipAddress) ? data.ipAddress[0] : data.ipAddress,
                userAgent: Array.isArray(data.userAgent) ? data.userAgent[0] : data.userAgent,
                timestamp: new Date(),
            };
            await AuditLog.create(normalizedData);
        } catch (error) {
            logger.error('Audit log error:', error);
            // Don't throw - audit logging should not break main flow
        }
    }

    async getUserLogs(userId: string, limit: number = 100) {
        return await AuditLog.find({ userId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
    }

    async getResourceLogs(resource: string, resourceId: string, limit: number = 100) {
        return await AuditLog.find({ resource, resourceId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
    }

    async getActionLogs(action: string, limit: number = 100) {
        return await AuditLog.find({ action })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
    }
}

export const auditService = new AuditService();