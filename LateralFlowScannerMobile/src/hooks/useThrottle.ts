import { useRef, useCallback } from 'react';

export const useThrottle = <T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 500
): T => {
    const lastRan = useRef<number>(Date.now());

    return useCallback(
        (...args: Parameters<T>) => {
            const now = Date.now();

            if (now - lastRan.current >= delay) {
                callback(...args);
                lastRan.current = now;
            }
        },
        [callback, delay]
    ) as T;
};