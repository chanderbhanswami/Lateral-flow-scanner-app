/**
 * Border Detection Utilities - Worklet Compatible
 * Works with OpenCV contour data
 */

// Inline types
interface BorderDetection {
    detected: boolean;
    confidence: number;
    corners: Array<{ x: number; y: number }>;
    area: number;
    aspectRatio: number;
    isRectangular: boolean;
    isAligned: boolean;
    isCentered: boolean;
}

// Inline thresholds
const BORDER_THRESHOLDS = {
    MIN_AREA: 1000,
    ASPECT_RATIO_MIN: 2.5,
    ASPECT_RATIO_MAX: 4.5,
    ALIGNMENT_TOLERANCE: 10, // degrees
    CENTER_TOLERANCE: 0.15   // fraction of frame
};

/**
 * Analyze border from detected corners (Worklet-safe)
 */
export function analyzeBorderWorklet(
    corners: Array<{ x: number; y: number }>,
    frameWidth: number,
    frameHeight: number
): BorderDetection {
    'worklet';

    if (!corners || corners.length !== 4) {
        return {
            detected: false,
            confidence: 0,
            corners: [],
            area: 0,
            aspectRatio: 0,
            isRectangular: false,
            isAligned: false,
            isCentered: false
        };
    }

    // Calculate area using Shoelace formula
    let area = 0;
    for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        area += corners[i].x * corners[j].y;
        area -= corners[j].x * corners[i].y;
    }
    area = Math.abs(area) / 2;

    // Calculate width and height
    const width = Math.sqrt(
        Math.pow(corners[1].x - corners[0].x, 2) +
        Math.pow(corners[1].y - corners[0].y, 2)
    );
    const height = Math.sqrt(
        Math.pow(corners[3].x - corners[0].x, 2) +
        Math.pow(corners[3].y - corners[0].y, 2)
    );

    const aspectRatio = height > 0 ? width / height : 0;
    const normalizedRatio = aspectRatio > 1 ? aspectRatio : 1 / aspectRatio;

    // Check if aspect ratio matches cassette (roughly 1:3.5)
    const isRectangular = normalizedRatio >= BORDER_THRESHOLDS.ASPECT_RATIO_MIN &&
        normalizedRatio <= BORDER_THRESHOLDS.ASPECT_RATIO_MAX;

    // Calculate center of detected border
    const centerX = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
    const centerY = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;

    // Check if centered
    const frameCenterX = frameWidth / 2;
    const frameCenterY = frameHeight / 2;
    const offsetX = Math.abs(centerX - frameCenterX) / frameWidth;
    const offsetY = Math.abs(centerY - frameCenterY) / frameHeight;
    const isCentered = offsetX < BORDER_THRESHOLDS.CENTER_TOLERANCE &&
        offsetY < BORDER_THRESHOLDS.CENTER_TOLERANCE;

    // Check alignment (how horizontal/vertical the edges are)
    const angle1 = Math.atan2(corners[1].y - corners[0].y, corners[1].x - corners[0].x) * 180 / Math.PI;
    const isAligned = Math.abs(angle1) < BORDER_THRESHOLDS.ALIGNMENT_TOLERANCE ||
        Math.abs(angle1 - 90) < BORDER_THRESHOLDS.ALIGNMENT_TOLERANCE ||
        Math.abs(angle1 + 90) < BORDER_THRESHOLDS.ALIGNMENT_TOLERANCE ||
        Math.abs(Math.abs(angle1) - 180) < BORDER_THRESHOLDS.ALIGNMENT_TOLERANCE;

    // Confidence based on multiple factors
    const areaConfidence = Math.min(area / (frameWidth * frameHeight * 0.4), 1);
    const shapeConfidence = isRectangular ? 1 : 0.5;
    const alignmentConfidence = isAligned ? 1 : 0.7;
    const centerConfidence = isCentered ? 1 : 0.8;

    const confidence = (areaConfidence * 0.3 + shapeConfidence * 0.3 +
        alignmentConfidence * 0.2 + centerConfidence * 0.2);

    return {
        detected: area > BORDER_THRESHOLDS.MIN_AREA,
        confidence,
        corners,
        area,
        aspectRatio: normalizedRatio,
        isRectangular,
        isAligned,
        isCentered
    };
}

/**
 * Calculate best corners from rotated rect data (Worklet-safe)
 */
export function calculateCornersFromRectWorklet(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    angleDegrees: number
): Array<{ x: number; y: number }> {
    'worklet';

    const angleRad = angleDegrees * (Math.PI / 180);
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    const hw = width / 2;
    const hh = height / 2;

    const calculateCorner = (dx: number, dy: number) => ({
        x: centerX + (dx * cosA - dy * sinA),
        y: centerY + (dx * sinA + dy * cosA)
    });

    return [
        calculateCorner(-hw, -hh), // Top-left
        calculateCorner(hw, -hh),  // Top-right
        calculateCorner(hw, hh),   // Bottom-right
        calculateCorner(-hw, hh)   // Bottom-left
    ];
}