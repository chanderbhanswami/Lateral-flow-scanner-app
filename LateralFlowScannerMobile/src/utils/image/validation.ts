/**
 * Image Validation Utilities - Mixed Worklet/JS
 */

// Inline types
interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate image dimensions (Worklet-safe)
 */
export function validateDimensionsWorklet(
    width: number,
    height: number,
    minWidth: number = 640,
    minHeight: number = 480,
    maxWidth: number = 8000,
    maxHeight: number = 8000
): { valid: boolean; error?: string } {
    'worklet';

    if (width < minWidth || height < minHeight) {
        return { valid: false, error: `Image too small: ${width}x${height}` };
    }

    if (width > maxWidth || height > maxHeight) {
        return { valid: false, error: `Image too large: ${width}x${height}` };
    }

    return { valid: true };
}

/**
 * Validate aspect ratio for cassette (Worklet-safe)
 */
export function validateAspectRatioWorklet(
    width: number,
    height: number,
    targetRatio: number = 3.5,
    tolerance: number = 1.0
): { valid: boolean; actualRatio: number; error?: string } {
    'worklet';

    const actualRatio = height > width ? height / width : width / height;
    const diff = Math.abs(actualRatio - targetRatio);

    if (diff > tolerance) {
        return {
            valid: false,
            actualRatio,
            error: `Aspect ratio ${actualRatio.toFixed(2)} differs from expected ${targetRatio}`
        };
    }

    return { valid: true, actualRatio };
}

/**
 * Full image validation (JS context)
 */
export function validateImageJS(
    width: number,
    height: number,
    fileSize: number,
    format: string
): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check dimensions
    if (width < 640 || height < 480) {
        errors.push('Resolution too low for accurate analysis');
    }

    // Check file size
    if (fileSize < 10000) {
        errors.push('File too small - may be corrupted');
    }
    if (fileSize > 50 * 1024 * 1024) {
        warnings.push('Large file size - may slow processing');
    }

    // Check format
    const validFormats = ['jpg', 'jpeg', 'png', 'heic', 'heif'];
    if (!validFormats.includes(format.toLowerCase())) {
        errors.push(`Unsupported format: ${format}`);
    }

    // Check aspect ratio
    const ratio = Math.max(width, height) / Math.min(width, height);
    if (ratio > 5) {
        warnings.push('Unusual aspect ratio detected');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate capture conditions (Worklet-safe)
 */
export function validateCaptureConditionsWorklet(
    isBlurry: boolean,
    isUnderexposed: boolean,
    isOverexposed: boolean,
    hasShadow: boolean,
    hasReflection: boolean,
    isBorderDetected: boolean
): { canCapture: boolean; blockingIssues: string[] } {
    'worklet';

    const blockingIssues: string[] = [];

    if (isBlurry) {
        blockingIssues.push('Image is too blurry');
    }

    if (isUnderexposed) {
        blockingIssues.push('Image is underexposed');
    }

    if (isOverexposed) {
        blockingIssues.push('Image is overexposed');
    }

    // These are warnings but don't block capture
    // if (hasShadow) blockingIssues.push('Shadow detected');
    // if (hasReflection) blockingIssues.push('Reflection detected');

    return {
        canCapture: blockingIssues.length === 0,
        blockingIssues
    };
}