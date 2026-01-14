export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

interface RetryOptions {
    retries?: number;
    delay?: number;
}

export const retry = async <T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> => {
    const { retries = 3, delay = 1000 } = options;
    try {
        return await fn();
    } catch (error) {
        if (retries > 0) {
            await sleep(delay);
            return retry(fn, { retries: retries - 1, delay: delay * 2 });
        }
        throw error;
    }
};

export const chunkArray = <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce((result, item) => {
        const groupKey = String(item[key]);
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {} as Record<string, T[]>);
};

export const sanitizeFilename = (filename: string): string => {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

export const truncateString = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
};

export const parseBoolean = (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
};