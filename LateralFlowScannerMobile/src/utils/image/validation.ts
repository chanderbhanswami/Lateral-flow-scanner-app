import RNFS from 'react-native-fs';
import { VALIDATION_CONSTANTS } from '../../constants';

export const validateImageFile = async (uri: string): Promise<{
    valid: boolean;
    errors: string[];
}> => {
    const errors: string[] = [];

    try {
        // Check if file exists
        const exists = await RNFS.exists(uri);
        if (!exists) {
            errors.push('Image file does not exist');
            return { valid: false, errors };
        }

        // Check file size
        const stat = await RNFS.stat(uri);
        const sizeInMB = stat.size / (1024 * 1024);

        if (sizeInMB > VALIDATION_CONSTANTS.IMAGE.MAX_SIZE_MB) {
            errors.push(`Image size exceeds ${VALIDATION_CONSTANTS.IMAGE.MAX_SIZE_MB}MB`);
        }

        // Check file extension
        const extension = uri.split('.').pop()?.toLowerCase();
        if (extension && !VALIDATION_CONSTANTS.IMAGE.ALLOWED_FORMATS.includes(extension)) {
            errors.push('Invalid image format');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    } catch (error) {
        errors.push('Failed to validate image file');
        return { valid: false, errors };
    }
};

export const validateImageDimensions = (
    width: number,
    height: number
): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (width < VALIDATION_CONSTANTS.IMAGE.MIN_WIDTH) {
        errors.push(`Image width must be at least ${VALIDATION_CONSTANTS.IMAGE.MIN_WIDTH}px`);
    }

    if (height < VALIDATION_CONSTANTS.IMAGE.MIN_HEIGHT) {
        errors.push(`Image height must be at least ${VALIDATION_CONSTANTS.IMAGE.MIN_HEIGHT}px`);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};