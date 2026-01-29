import { useState, useCallback, useRef } from 'react';
import { BorderDetection } from '../types';

// Import utilities directly
import { analyzeBorderWorklet } from '../utils/analysis/border';

// Frame dimensions (should match useFrameProcessor)
const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 480;

export const useBorderDetection = () => {
    const [borderData, setBorderData] = useState<BorderDetection>({
        detected: false,
        confidence: 0,
        corners: [],
        area: 0,
        aspectRatio: 0,
        isAligned: false,
        isCentered: false,
        distanceFromCenter: 0,
    });

    const [guideColor, setGuideColor] = useState<string>('red');

    // Stability Logic
    const stableCount = useRef(0);
    const STABILITY_THRESHOLD = 8; // Require 8 consecutive valid frames (~0.5s - 1s) to lock on

    const updateBorderDetection = useCallback((corners: Array<{ x: number; y: number }>, sourceWidth?: number, sourceHeight?: number) => {
        // Use utility for border analysis
        // Use passed dimensions if available, else fallback to constants
        const w = sourceWidth || FRAME_WIDTH;
        const h = sourceHeight || FRAME_HEIGHT;
        const analysis = analyzeBorderWorklet(corners, w, h);

        // Hysteresis / Stability Check
        if (analysis.detected) {
            stableCount.current += 1;
        } else {
            stableCount.current = 0;
        }

        // Only show "Detected" if we have been stable for a while
        const isStable = stableCount.current >= STABILITY_THRESHOLD;

        // Calculate distance from center (Normalized 0-1)
        let distanceFromCenter = 0;
        if (corners.length === 4) {
            const centerX = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
            const centerY = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;

            // FIX: Normalize coordinates before comparing to 0.5 center
            const normX = centerX / w;
            const normY = centerY / h;

            // Center is always 0.5, 0.5 in normalized space
            distanceFromCenter = Math.sqrt(
                Math.pow(normX - 0.5, 2) +
                Math.pow(normY - 0.5, 2)
            );
        }

        const detection: BorderDetection = {
            detected: isStable, // Override with stability
            confidence: isStable ? analysis.confidence : 0,
            corners: analysis.corners,
            area: analysis.area,
            aspectRatio: analysis.aspectRatio,
            isAligned: analysis.isAligned,
            isCentered: analysis.isCentered,
            distanceFromCenter,
            sourceWidth: w,
            sourceHeight: h,
        };

        // Always update state to drive UI (green/red border)
        // If !isStable, we effectively hide the dynamic border (or show it as red/searching if we wanted, but user wants Static Guide Default)
        setBorderData(detection);

        // Update guide color based on alignment
        if (isStable && detection.isAligned && detection.isCentered) {
            setGuideColor('green');
        } else if (isStable) {
            setGuideColor('yellow'); // Detected but not aligned
        } else {
            setGuideColor('red');
        }
    }, []);

    const resetBorderDetection = useCallback(() => {
        setBorderData({
            detected: false,
            confidence: 0,
            corners: [],
            area: 0,
            aspectRatio: 0,
            isAligned: false,
            isCentered: false,
            distanceFromCenter: 0,
        });
        setGuideColor('red');
    }, []);

    return {
        borderData,
        guideColor,
        updateBorderDetection,
        resetBorderDetection,
    };
};