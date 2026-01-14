export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public code: string = 'API_ERROR'
    ) {
        super(message);
        this.name = 'ApiError';
    }
}