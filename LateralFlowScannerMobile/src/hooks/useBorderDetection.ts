import { useState, useCallback, useEffect } from 'react';
import { BorderDetection } from '../types';
import { imageProcessingService } from '../services/imageProcessing.service';

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
        const detection = imageProcessingService.analyzeBorderDetection(corners);
        setBorderData(detection);

        // Update guide color based on alignment
        if (detection.detected && detection.isAligned && detection.isCentered) {
            setGuideColor('green');
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