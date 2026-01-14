import { ENV } from './env';

export const API_CONFIG = {
    baseURL: ENV.API_BASE_URL,
    timeout: ENV.API_TIMEOUT,
    retryAttempts: 3,
    retryDelay: 1000,
};