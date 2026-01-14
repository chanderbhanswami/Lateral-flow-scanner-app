/**
 * Supabase Audit Logging Service
 * 
 * Provides PostgreSQL-based audit logging using Supabase.
 * Used for tracking all system actions for compliance and debugging.
 */

import { Pool } from 'pg';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface AuditLogEntry {
    id?: string;
    userId: string;
    action: AuditAction;
    resourceType: ResourceType;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string | string[];
    userAgent?: string | string[];
    status: 'success' | 'failure';
    errorMessage?: string;
    timestamp?: Date;
    metadata?: Record<string, unknown>;
}

export type AuditAction =
    | 'USER_LOGIN'
    | 'USER_LOGOUT'
    | 'USER_REGISTER'
    | 'USER_UPDATE'
    | 'USER_DELETE'
    | 'CAPTURE_CREATE'
    | 'CAPTURE_UPDATE'
    | 'CAPTURE_DELETE'
    | 'CAPTURE_UPLOAD'
    | 'BATCH_CREATE'
    | 'BATCH_UPDATE'
    | 'BATCH_DELETE'
    | 'API_ACCESS'
    | 'SETTINGS_CHANGE'
    | 'PERMISSION_CHANGE'
    | 'EXPORT_DATA'
    | 'IMPORT_DATA';

export type ResourceType =
    | 'user'
    | 'capture'
    | 'concentration_batch'
    | 'image'
    | 'settings'
    | 'api_key'
    | 'session';

class SupabaseAuditService {
    private pool: Pool | null = null;
    private isInitialized = false;
    private pendingLogs: AuditLogEntry[] = [];
    private readonly batchSize = 50;
    private flushInterval: NodeJS.Timeout | null = null;

    /**
     * Check if the service is configured and ready
     */
    isConfigured(): boolean {
        return this.isInitialized;
    }

    /**
     * Initialize the Supabase connection
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        const postgresUri = config.POSTGRES_URI;
        if (!postgresUri) {
            logger.warn('POSTGRES_URI not configured. Audit logging to PostgreSQL is disabled.');
            return;
        }

        try {
            this.pool = new Pool({
                connectionString: postgresUri,
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            // Create tables if not exist
            await this.createTables();

            this.isInitialized = true;

            // Start batch flush interval
            this.flushInterval = setInterval(() => this.flushPendingLogs(), 5000);

            logger.info('Supabase audit service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Supabase audit service:', error);
            // Continue without audit logging
        }
    }

    /**
     * Create audit log tables
     */
    private async createTables(): Promise<void> {
        if (!this.pool) return;

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(255) NOT NULL,
                action VARCHAR(100) NOT NULL,
                resource_type VARCHAR(100) NOT NULL,
                resource_id VARCHAR(255),
                details JSONB,
                ip_address VARCHAR(45),
                user_agent TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'success',
                error_message TEXT,
                metadata JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
        `;

        await this.pool.query(createTableSQL);
    }

    /**
     * Log an audit entry
     */
    async log(entry: AuditLogEntry): Promise<void> {
        // Add to pending queue
        this.pendingLogs.push({
            ...entry,
            timestamp: entry.timestamp || new Date(),
        });

        // Flush if batch size reached
        if (this.pendingLogs.length >= this.batchSize) {
            await this.flushPendingLogs();
        }

        // Also log to MongoDB audit collection as backup
        this.logToMongoDB(entry).catch(err =>
            logger.error('Failed to log audit to MongoDB:', err)
        );
    }

    /**
     * Flush pending logs to database
     */
    private async flushPendingLogs(): Promise<void> {
        if (this.pendingLogs.length === 0) return;
        if (!this.pool || !this.isInitialized) {
            this.pendingLogs = [];
            return;
        }

        const logsToFlush = [...this.pendingLogs];
        this.pendingLogs = [];

        try {
            const client = await this.pool.connect();

            try {
                await client.query('BEGIN');

                for (const log of logsToFlush) {
                    await client.query(
                        `INSERT INTO audit_logs 
                         (user_id, action, resource_type, resource_id, details, ip_address, 
                          user_agent, status, error_message, metadata, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                        [
                            log.userId,
                            log.action,
                            log.resourceType,
                            log.resourceId || null,
                            JSON.stringify(log.details || {}),
                            log.ipAddress || null,
                            log.userAgent || null,
                            log.status,
                            log.errorMessage || null,
                            JSON.stringify(log.metadata || {}),
                            log.timestamp,
                        ]
                    );
                }

                await client.query('COMMIT');
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            logger.error('Failed to flush audit logs to Supabase:', error);
            // Re-add failed logs to queue (with limit to prevent memory issues)
            if (this.pendingLogs.length < 1000) {
                this.pendingLogs.unshift(...logsToFlush);
            }
        }
    }

    /**
     * Log to MongoDB as backup
     */
    private async logToMongoDB(entry: AuditLogEntry): Promise<void> {
        // This will be handled by the existing MongoDB audit service
        const { AuditLog } = await import('../models/AuditLog.model');
        await AuditLog.create({
            userId: entry.userId,
            action: entry.action,
            resource: entry.resourceType, // Map resourceType to resource field
            resourceId: entry.resourceId,
            details: entry.details,
            ipAddress: Array.isArray(entry.ipAddress) ? entry.ipAddress[0] : entry.ipAddress,
            userAgent: Array.isArray(entry.userAgent) ? entry.userAgent[0] : entry.userAgent,
            timestamp: entry.timestamp,
        });
    }

    /**
     * Query audit logs with filters
     */
    async query(filters: {
        userId?: string;
        action?: AuditAction;
        resourceType?: ResourceType;
        startDate?: Date;
        endDate?: Date;
        status?: 'success' | 'failure';
        limit?: number;
        offset?: number;
    }): Promise<{ logs: AuditLogEntry[]; total: number }> {
        if (!this.pool || !this.isInitialized) {
            return { logs: [], total: 0 };
        }

        const conditions: string[] = [];
        const params: unknown[] = [];
        let paramIndex = 1;

        if (filters.userId) {
            conditions.push(`user_id = $${paramIndex++}`);
            params.push(filters.userId);
        }

        if (filters.action) {
            conditions.push(`action = $${paramIndex++}`);
            params.push(filters.action);
        }

        if (filters.resourceType) {
            conditions.push(`resource_type = $${paramIndex++}`);
            params.push(filters.resourceType);
        }

        if (filters.status) {
            conditions.push(`status = $${paramIndex++}`);
            params.push(filters.status);
        }

        if (filters.startDate) {
            conditions.push(`created_at >= $${paramIndex++}`);
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            conditions.push(`created_at <= $${paramIndex++}`);
            params.push(filters.endDate);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = filters.limit || 100;
        const offset = filters.offset || 0;

        const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
        const dataQuery = `
            SELECT * FROM audit_logs 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const [countResult, dataResult] = await Promise.all([
            this.pool.query(countQuery, params),
            this.pool.query(dataQuery, params),
        ]);

        return {
            logs: dataResult.rows.map(row => ({
                id: row.id,
                userId: row.user_id,
                action: row.action,
                resourceType: row.resource_type,
                resourceId: row.resource_id,
                details: row.details,
                ipAddress: row.ip_address,
                userAgent: row.user_agent,
                status: row.status,
                errorMessage: row.error_message,
                timestamp: row.created_at,
                metadata: row.metadata,
            })),
            total: parseInt(countResult.rows[0].total, 10),
        };
    }

    /**
     * Get user activity summary
     */
    async getUserActivitySummary(userId: string, days: number = 30): Promise<{
        totalActions: number;
        actionBreakdown: Record<string, number>;
        dailyActivity: { date: string; count: number }[];
    }> {
        if (!this.pool || !this.isInitialized) {
            return { totalActions: 0, actionBreakdown: {}, dailyActivity: [] };
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const summaryQuery = `
            SELECT 
                COUNT(*) as total,
                action,
                DATE(created_at) as date
            FROM audit_logs
            WHERE user_id = $1 AND created_at >= $2
            GROUP BY action, DATE(created_at)
            ORDER BY date DESC
        `;

        const result = await this.pool.query(summaryQuery, [userId, startDate]);

        const actionBreakdown: Record<string, number> = {};
        const dailyMap: Record<string, number> = {};

        for (const row of result.rows) {
            actionBreakdown[row.action] = (actionBreakdown[row.action] || 0) + parseInt(row.total, 10);
            const dateStr = row.date.toISOString().split('T')[0];
            dailyMap[dateStr] = (dailyMap[dateStr] || 0) + parseInt(row.total, 10);
        }

        const dailyActivity = Object.entries(dailyMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const totalActions = Object.values(actionBreakdown).reduce((a, b) => a + b, 0);

        return { totalActions, actionBreakdown, dailyActivity };
    }

    /**
     * Clean up old audit logs
     */
    async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
        if (!this.pool || !this.isInitialized) return 0;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await this.pool.query(
            'DELETE FROM audit_logs WHERE created_at < $1 RETURNING id',
            [cutoffDate]
        );

        return result.rowCount || 0;
    }

    /**
     * Close the connection pool
     */
    async shutdown(): Promise<void> {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }

        await this.flushPendingLogs();

        if (this.pool) {
            await this.pool.end();
        }

        this.isInitialized = false;
    }
}

export const supabaseAuditService = new SupabaseAuditService();
