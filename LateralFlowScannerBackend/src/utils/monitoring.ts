import { logger } from './logger';

interface Metric {
    name: string;
    value: number;
    timestamp: number;
    tags?: Record<string, string>;
}

class MonitoringService {
    private metrics: Metric[] = [];

    recordMetric(name: string, value: number, tags?: Record<string, string>) {
        const metric: Metric = {
            name,
            value,
            timestamp: Date.now(),
            tags,
        };

        this.metrics.push(metric);

        // In production, send to monitoring service (Prometheus, Datadog, etc.)
        logger.info('Metric:', metric);
    }

    recordRequestDuration(route: string, duration: number) {
        this.recordMetric('http_request_duration_ms', duration, {
            route,
        });
    }

    recordDatabaseQuery(operation: string, duration: number) {
        this.recordMetric('db_query_duration_ms', duration, {
            operation,
        });
    }

    recordCacheHit(key: string) {
        this.recordMetric('cache_hit', 1, { key });
    }

    recordCacheMiss(key: string) {
        this.recordMetric('cache_miss', 1, { key });
    }

    recordUploadSize(size: number) {
        this.recordMetric('upload_size_bytes', size);
    }

    getMetrics(): Metric[] {
        return [...this.metrics];
    }

    clearMetrics() {
        this.metrics = [];
    }
}

export const monitoring = new MonitoringService();