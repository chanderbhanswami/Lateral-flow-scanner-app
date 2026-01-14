export interface PaginationParams {
    page: number;
    pageSize: number;
}

export interface PaginationResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
    hasPrevious: boolean;
}

export const paginate = <T>(
    items: T[],
    params: PaginationParams
): PaginationResult<T> => {
    const { page, pageSize } = params;
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const skip = (page - 1) * pageSize;

    const paginatedItems = items.slice(skip, skip + pageSize);

    return {
        items: paginatedItems,
        total,
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
        hasPrevious: page > 1,
    };
};

export const getPaginationParams = (query: any): PaginationParams => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 20));

    return { page, pageSize };
};