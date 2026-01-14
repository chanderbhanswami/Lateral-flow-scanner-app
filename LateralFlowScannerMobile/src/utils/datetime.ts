import { format, formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';

export const formatDate = (date: string | Date, formatString: string = 'PPP'): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatString);
};

export const formatTime = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'p');
};

export const formatDateTime = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'PPP p');
};

export const formatRelativeTime = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
};

export const getDaysDifference = (date1: string | Date, date2: string | Date): number => {
    const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
    const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
    return differenceInDays(d1, d2);
};

export const isToday = (date: string | Date): boolean => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const today = new Date();
    return format(dateObj, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
};