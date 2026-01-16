/**
 * Image Compression Utilities - JS Only
 * These work with file system and cannot run in Worklets
 */

// Inline types
interface CompressionOptions {
    quality: number;       // 0-100
    maxWidth: number;
    maxHeight: number;
    format: 'jpeg' | 'png';
}

interface CompressionResult {
    width: number;
    height: number;
    size: number;
    path: string;
}

/**
 * Calculate optimal dimensions while maintaining aspect ratio (JS)
 */
export function calculateResizeDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number; scale: number } {
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
        return { width: originalWidth, height: originalHeight, scale: 1 };
    }

    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const scale = Math.min(widthRatio, heightRatio);

    return {
        width: Math.round(originalWidth * scale),
        height: Math.round(originalHeight * scale),
        scale
    };
}

/**
 * Estimate compressed file size (JS)
 */
export function estimateCompressedSize(
    width: number,
    height: number,
    quality: number,
    format: 'jpeg' | 'png' = 'jpeg'
): number {
    const pixelCount = width * height;

    // Rough estimates based on typical compression ratios
    if (format === 'png') {
        // PNG is lossless, roughly 3-5 bytes per pixel depending on content
        return pixelCount * 4;
    }

    // JPEG compression varies with quality
    // Quality 100 ≈ 2 bytes/pixel, Quality 50 ≈ 0.3 bytes/pixel
    const bpp = 0.3 + (quality / 100) * 1.7;
    return Math.round(pixelCount * bpp);
}

/**
 * Get recommended quality based on target file size (JS)
 */
export function getRecommendedQuality(
    width: number,
    height: number,
    targetSizeBytes: number
): number {
    const pixelCount = width * height;
    const targetBpp = targetSizeBytes / pixelCount;

    // Reverse the estimation formula
    // bpp = 0.3 + (quality / 100) * 1.7
    // quality = (bpp - 0.3) * 100 / 1.7
    const quality = ((targetBpp - 0.3) * 100) / 1.7;

    // Clamp to valid range
    return Math.max(10, Math.min(100, Math.round(quality)));
}