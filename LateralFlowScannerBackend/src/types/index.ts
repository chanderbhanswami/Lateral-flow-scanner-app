export * from '@lateralflowscanner/shared';

// Shared library provides ApiResponse, ApiError, PaginatedResponse
// We only keep QueryOptions here if it's not in Shared

export interface QueryOptions {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filter?: Record<string, any>;
}