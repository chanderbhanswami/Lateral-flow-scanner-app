import { useCallback, useMemo } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { OpenCV } from 'react-native-fast-opencv';
import { Platform } from 'react-native';

export const useCustomFrameProcessor = (
    onBorderDetected: (corners: Array<{ x: number; y: number }>) => void,
    onQualityAnalysis: (analysis: any) => void
) => {
    // Create worklet-callable version of callback using worklets-core
    const runOnJsBorderDetected = useMemo(
        () => Worklets.createRunOnJS(onBorderDetected),
        [onBorderDetected]
    );

    const frameProcessor = useFrameProcessor((frame) => {
        'worklet';

        // Initialize OpenCV
        // Cast to any to bypass strict TS checks on JSI methods
        const cv = OpenCV as any;

        try {
            if (!cv) return;

            // 1. Convert Frame to Mat
            const src = cv.frame(frame);
            const gray = cv.createObject(cv.Mat);

            // 2. Convert to Grayscale
            if (Platform.OS === 'android') {
                cv.invoke('cvtColor', src, gray, cv.COLOR_BGR2GRAY);
            } else {
                cv.invoke('cvtColor', src, gray, cv.COLOR_BGRA2GRAY);
            }

            // 3. Blur (reduce noise)
            cv.invoke('GaussianBlur', gray, gray, { width: 5, height: 5 }, 0);

            // 4. Canny Edge Detection
            const edges = cv.createObject(cv.Mat);
            cv.invoke('Canny', gray, edges, 75, 200);

            // 5. Find Contours
            const contours = cv.createVector();
            const hierarchy = cv.createObject(cv.Mat);
            cv.invoke('findContours', edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            // 6. Loop contours to find largest quadrilateral (rotated rect)
            const count = contours.size ? (typeof contours.size === 'function' ? contours.size() : contours.size) : 0;

            let maxArea = 0;
            let bestCorners = null;
            const loopLimit = Math.min(count, 20);

            for (let i = 0; i < loopLimit; i++) {
                const contour = cv.copyObjectFromVector(contours, i);

                const area = cv.invoke('contourArea', contour);
                if (area < 1000) continue;

                // Use minAreaRect to get the tightest fitting rotated rectangle
                // This 'hugs' the document border precisely
                const rotatedRect = cv.invoke('minAreaRect', contour);

                // Convert to JS object to get properties
                const rectData = cv.toJSValue(rotatedRect);
                const { center, size, angle } = rectData;

                // Extract properties (structure depends on lib version, usually {center:{x,y}, size:{width,height}, angle})
                // Or flat {centerX, centerY, width, height, angle}
                // We handle both common shapes safely:
                let cx = center ? center.x : rectData.centerX;
                let cy = center ? center.y : rectData.centerY;
                let w = size ? size.width : rectData.width;
                let h = size ? size.height : rectData.height;
                let ang = angle !== undefined ? angle : rectData.angle;

                const rectArea = w * h;
                if (rectArea > maxArea) {
                    maxArea = rectArea;

                    // Calculate 4 corners from Rotated Rect properties
                    // standard OpenCV minAreaRect returns degrees.
                    const angleRad = ang * (Math.PI / 180);

                    // Simple rotation logic relative to center
                    const cosA = Math.cos(angleRad);
                    const sinA = Math.sin(angleRad);

                    const calculateCorner = (dx: number, dy: number) => {
                        // Rotate then translate
                        // x' = x*cos - y*sin
                        // y' = x*sin + y*cos
                        return {
                            x: cx + (dx * cosA - dy * sinA),
                            y: cy + (dx * sinA + dy * cosA)
                        };
                    };

                    const hw = w / 2;
                    const hh = h / 2;

                    // 4 corners of the rectangle
                    bestCorners = [
                        calculateCorner(-hw, -hh), // Top-Left relative
                        calculateCorner(hw, -hh),  // Top-Right relative
                        calculateCorner(hw, hh),   // Bottom-Right relative
                        calculateCorner(-hw, hh)   // Bottom-Left relative
                    ];
                }
            }

            cv.clearBuffers();

            if (bestCorners) {
                runOnJsBorderDetected(bestCorners);
            }

        } catch (error) {
            // ignore runtime errors to prevent crashing camera
        }
    }, [runOnJsBorderDetected]);

    return frameProcessor;
};