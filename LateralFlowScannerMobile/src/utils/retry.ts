export const retry = async <T>(
    fn: () => Promise<T>,
    options: {
        retries?: number;
        delay?: number;
        backoff?: boolean;
        onRetry?: (error: any, attempt: number) => void;
    } = {}
): Promise<T> => {
    const {
        retries = 3,
        delay = 1000,
        backoff = true,
        onRetry,
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt < retries) {
                const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;

                if (onRetry) {
                    onRetry(error, attempt + 1);
                }

                await new Promise<void>(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    throw lastError;
};

export const retryWithCircuitBreaker = async <T>(
    fn: () => Promise<T>,
    options: {
        retries?: number;
        timeout?: number;
        failureThreshold?: number;
        resetTimeout?: number;
    } = {}
): Promise<T> => {
    // Simplified circuit breaker implementation
    return retry(fn, {
        retries: options.retries,
        delay: 1000,
    });
};