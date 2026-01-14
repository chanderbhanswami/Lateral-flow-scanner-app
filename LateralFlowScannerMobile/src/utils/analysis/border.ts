import { BorderDetection } from '../../types';
import { QUALITY_THRESHOLDS } from '../../constants';

/**
 * Analyze border detection results
 */
export const analyzeBorderDetection = (
    corners: Array<{ x: number; y: number }>,
    frameWidth: number = 1920,
    frameHeight: number = 1080
): BorderDetection => {
    if (corners.length !== 4) {
        return {
            detected: false,
            confidence: 0,
            corners: [],
            area: 0,
            aspectRatio: 0,
            isAligned: false,
            isCentered: false,
            distanceFromCenter: 0,
        };
    }

    // Calculate area using Shoelace formula
    let area = 0;
    for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        area += corners[i].x * corners[j].y;
        area -= corners[j].x * corners[i].y;
    }
    area = Math.abs(area / 2);

    // Calculate bounding box
    const xs = corners.map(c => c.x);
    const ys = corners.map(c => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = maxX - minX;
    const height = maxY - minY;
    const aspectRatio = width / height;

    // Check if centered
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const frameCenterX = frameWidth / 2;
    const frameCenterY = frameHeight / 2;
    const distanceFromCenter = Math.sqrt(
        Math.pow(centerX - frameCenterX, 2) + Math.pow(centerY - frameCenterY, 2)
    );

    const isCentered = distanceFromCenter < 200;

    const isAligned =
        aspectRatio >= QUALITY_THRESHOLDS.BORDER_DETECTION.ASPECT_RATIO_RANGE[0] &&
        aspectRatio <= QUALITY_THRESHOLDS.BORDER_DETECTION.ASPECT_RATIO_RANGE[1];

    const normalizedArea = area / (frameWidth * frameHeight);
    const confidence =
        normalizedArea >= QUALITY_THRESHOLDS.BORDER_DETECTION.MIN_AREA &&
            normalizedArea <= QUALITY_THRESHOLDS.BORDER_DETECTION.MAX_AREA &&
            isAligned
            ? 0.9
            : 0.5;

    return {
        detected: true,
        confidence,
        corners,
        area,
        aspectRatio,
        isAligned,
        isCentered,
        distanceFromCenter,
    };
};

/**
 * Calculate polygon area
 */
export const calculatePolygonArea = (points: Array<{ x: number; y: number }>): number => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
};