/**
 * Image Processing Utilities - Mixed Worklet/JS
 */

/**
 * Calculate center crop coordinates (Worklet-safe)
 */
export function calculateCenterCropWorklet(
    imageWidth: number,
    imageHeight: number,
    targetAspectRatio: number = 1 / 3.5
): { x: number; y: number; width: number; height: number } {
    'worklet';

    const currentAspect = imageWidth / imageHeight;

    let cropWidth: number, cropHeight: number;

    if (currentAspect > targetAspectRatio) {
        // Image is wider than target - crop sides
        cropHeight = imageHeight;
        cropWidth = imageHeight * targetAspectRatio;
    } else {
        // Image is taller than target - crop top/bottom
        cropWidth = imageWidth;
        cropHeight = imageWidth / targetAspectRatio;
    }

    return {
        x: (imageWidth - cropWidth) / 2,
        y: (imageHeight - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight
    };
}

/**
 * Scale coordinates from preview to photo resolution (Worklet-safe)
 */
export function scaleCoordinatesWorklet(
    corners: Array<{ x: number; y: number }>,
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number
): Array<{ x: number; y: number }> {
    'worklet';

    const scaleX = targetWidth / sourceWidth;
    const scaleY = targetHeight / sourceHeight;

    const scaled = new Array(corners.length);
    for (let i = 0; i < corners.length; i++) {
        scaled[i] = {
            x: corners[i].x * scaleX,
            y: corners[i].y * scaleY
        };
    }

    return scaled;
}

/**
 * Calculate bounding box from corners (Worklet-safe)
 */
export function getBoundingBoxWorklet(
    corners: Array<{ x: number; y: number }>
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
    'worklet';

    if (!corners || corners.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    let minX = corners[0].x;
    let maxX = corners[0].x;
    let minY = corners[0].y;
    let maxY = corners[0].y;

    for (let i = 1; i < corners.length; i++) {
        if (corners[i].x < minX) minX = corners[i].x;
        if (corners[i].x > maxX) maxX = corners[i].x;
        if (corners[i].y < minY) minY = corners[i].y;
        if (corners[i].y > maxY) maxY = corners[i].y;
    }

    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY
    };
}

/**
 * Rotate point around center (Worklet-safe)
 */
export function rotatePointWorklet(
    x: number,
    y: number,
    centerX: number,
    centerY: number,
    angleDegrees: number
): { x: number; y: number } {
    'worklet';

    const angleRad = angleDegrees * (Math.PI / 180);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const dx = x - centerX;
    const dy = y - centerY;

    return {
        x: centerX + (dx * cos - dy * sin),
        y: centerY + (dx * sin + dy * cos)
    };
}