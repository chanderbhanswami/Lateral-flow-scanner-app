export const CACHE_KEYS = {
    USER: (userId: string) => `user:${userId}`,
    USER_PROFILE: (userId: string) => `user:profile:${userId}`,
    CAPTURE: (captureId: string) => `capture:${captureId}`,
    CAPTURES_LIST: (userId: string, page: number) => `captures:list:${userId}:${page}`,
    CONCENTRATION_BATCHES: (userId: string) => `concentration:batches:${userId}`,
    STATISTICS: (userId: string) => `statistics:${userId}`,
} as const;

export const CACHE_TTL = {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
} as const;