export class AppError extends Error {
    constructor(
        message: string,
        public code?: string,
        public statusCode?: number
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export const handleError = (error: any): string => {
    if (error instanceof AppError) {
        return error.message;
    }

    if (error.response) {
        return error.response.data?.message || error.response.statusText || 'Server error';
    }

    if (error.request) {
        return 'Network error. Please check your connection.';
    }

    return error.message || 'An unexpected error occurred';
};