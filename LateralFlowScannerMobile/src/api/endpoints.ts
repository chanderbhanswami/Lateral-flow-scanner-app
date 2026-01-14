export const ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        REFRESH: '/auth/refresh',
        LOGOUT: '/auth/logout',
    },
    CAPTURE: {
        UPLOAD: '/capture/upload',
        GET: (id: string) => `/capture/${id}`,
        LIST: '/capture/list',
        DELETE: (id: string) => `/capture/${id}`,
    },
    CONCENTRATION: {
        CREATE: '/concentration/create',
        UPDATE: (id: string) => `/concentration/${id}`,
        DELETE: (id: string) => `/concentration/${id}`,
        LIST: '/concentration/list',
    },
    USER: {
        PROFILE: '/user/profile',
        UPDATE: '/user/profile',
        CHANGE_PASSWORD: '/user/change-password',
    },
    HEALTH: '/health',
} as const;