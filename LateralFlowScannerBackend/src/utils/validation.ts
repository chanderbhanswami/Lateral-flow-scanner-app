import { z } from 'zod';
import { ApiError } from './error';

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password: string): {
    valid: boolean;
    errors: string[];
} => {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*]/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*)');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

export const validateUUID = (uuid: string): boolean => {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

export const validateObjectId = (id: string): boolean => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

export const validateUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const validateDateRange = (
    startDate: string,
    endDate: string
): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
        errors.push('Invalid start date');
    }

    if (isNaN(end.getTime())) {
        errors.push('Invalid end date');
    }

    if (start > end) {
        errors.push('Start date must be before end date');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

export const sanitizeInput = (input: string): string => {
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // Remove javascript:
        .replace(/on\w+=/gi, ''); // Remove event handlers
};

export const validateFileSize = (
    size: number,
    maxSizeInMB: number
): boolean => {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return size <= maxSizeInBytes;
};

export const validateFileType = (
    mimetype: string,
    allowedTypes: string[]
): boolean => {
    return allowedTypes.includes(mimetype);
};

export const validatePagination = (
    page?: number,
    pageSize?: number
): { page: number; pageSize: number } => {
    const validPage = page && page > 0 ? Math.floor(page) : 1;
    const validPageSize =
        pageSize && pageSize > 0 && pageSize <= 100 ? Math.floor(pageSize) : 20;

    return { page: validPage, pageSize: validPageSize };
};

export const validateBase64Image = (base64: string): boolean => {
    const base64Regex = /^data:image\/(png|jpg|jpeg|gif);base64,/;
    return base64Regex.test(base64);
};

export const parseZodError = (error: z.ZodError): Record<string, string[]> => {
    const errors: Record<string, string[]> = {};

    error.issues.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
            errors[path] = [];
        }
        errors[path].push(err.message);
    });

    return errors;
};