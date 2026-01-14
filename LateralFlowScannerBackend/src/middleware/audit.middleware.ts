import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

export const auditMiddleware = (action: string, resource: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const originalSend = res.send;

        res.send = function (data) {
            res.send = originalSend;

            // Log after successful response
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const userId = (req as any).user?.userId;

                if (userId) {
                    auditService.log({
                        userId,
                        action,
                        resource,
                        resourceId: req.params.id,
                        details: {
                            method: req.method,
                            path: req.path,
                            query: req.query,
                            body: sanitizeBody(req.body),
                        },
                        ipAddress: req.ip as any,
                        userAgent: req.get('user-agent') as any,
                    });
                }
            }

            return originalSend.call(this, data);
        };

        next();
    };
};

function sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };

    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.imageBase64;

    return sanitized;
}