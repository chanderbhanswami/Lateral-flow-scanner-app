import { useState, useCallback } from 'react';
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

    const updateBorderDetection = useCallback((corners: Array<{ x: number; y: number }>) => {
        // Use utility for border analysis
        const analysis = analyzeBorderWorklet(corners, FRAME_WIDTH, FRAME_HEIGHT);

        // Calculate distance from center
        let distanceFromCenter = 0;
        if (corners.length === 4) {
            const centerX = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
            const centerY = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;
            const frameCenterX = FRAME_WIDTH / 2;
            const frameCenterY = FRAME_HEIGHT / 2;
            distanceFromCenter = Math.sqrt(
                Math.pow(centerX - frameCenterX, 2) +
                Math.pow(centerY - frameCenterY, 2)
            );
        }

        const detection: BorderDetection = {
            detected: analysis.detected,
            confidence: analysis.confidence,
            corners: analysis.corners,
            area: analysis.area,
            aspectRatio: analysis.aspectRatio,
            isAligned: analysis.isAligned,
            isCentered: analysis.isCentered,
            distanceFromCenter,
        };

        setBorderData(detection);

        // Update guide color based on alignment
        if (detection.detected && detection.isAligned && detection.isCentered) {
            setGuideColor('green');
        } else if (detection.detected) {
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