import { useCallback, useMemo } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { OpenCV } from 'react-native-fast-opencv';
import { useResizePlugin } from 'vision-camera-resize-plugin';

export const useCustomFrameProcessor = (
    onBorderDetected: (corners: Array<{ x: number; y: number }>) => void,
    onQualityAnalysis: (analysis: any) => void
) => {
    // Create worklet-callable version of callback using worklets-core
    const runOnJsBorderDetected = useMemo(
        () => Worklets.createRunOnJS(onBorderDetected),
        [onBorderDetected]
    );

    // Get the resize plugin instance
    const { resize } = useResizePlugin();

    const frameProcessor = useFrameProcessor((frame) => {
        'worklet';

        const cv = OpenCV as any;

        try {
            if (!cv) return;

            // 1. Resize frame for better performance (smaller = faster processing)
            // Use RGBA format which is easier to work with
            const resized = resize(frame, {
                scale: {
                    width: 640,
                    height: 480,
                },
                pixelFormat: 'rgba',
                dataType: 'uint8',
            });

            // 2. Convert frame buffer to OpenCV Mat
            // frameBufferToMat(rows, cols, channels, buffer)
            const src = cv.frameBufferToMat(
                480,  // height (rows)
                640,  // width (cols)
                4,    // 4 channels for RGBA
                resized
            );

            // 3. Convert RGBA to Grayscale
            const gray = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('cvtColor', src, gray, cv.COLOR_RGBA2GRAY);

            // 4. Blur (reduce noise)
            cv.invoke('GaussianBlur', gray, gray, { width: 5, height: 5 }, 0);

            // 5. Canny Edge Detection
            const edges = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('Canny', gray, edges, 75, 200);

            // 6. Find Contours
            const contours = cv.createObject(cv.ObjectType.MatVector);
            const hierarchy = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('findContours', edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            // 7. Loop contours to find largest quadrilateral
            const count = cv.invoke('size', contours);

            let maxArea = 0;
            let bestCorners: Array<{ x: number; y: number }> | null = null;
            const loopLimit = Math.min(count, 20);

            for (let i = 0; i < loopLimit; i++) {
                const contour = cv.invoke('getVector', contours, i);

                const area = cv.invoke('contourArea', contour);
                if (area < 1000) continue;

                // Use minAreaRect to get the tightest fitting rotated rectangle
                const rotatedRect = cv.invoke('minAreaRect', contour);

                // Convert to JS object to get properties
                const rectData = cv.toJSValue(rotatedRect);

                // Extract properties - handle different possible structures
                const center = rectData.center || { x: rectData.centerX, y: rectData.centerY };
                const size = rectData.size || { width: rectData.width, height: rectData.height };
                const ang = rectData.angle !== undefined ? rectData.angle : 0;

                const cx = center.x || 0;
                const cy = center.y || 0;
                const w = size.width || 0;
                const h = size.height || 0;

                const rectArea = w * h;
                if (rectArea > maxArea) {
                    maxArea = rectArea;

                    // Calculate 4 corners from Rotated Rect properties
                    const angleRad = ang * (Math.PI / 180);
                    const cosA = Math.cos(angleRad);
                    const sinA = Math.sin(angleRad);

                    const calculateCorner = (dx: number, dy: number) => ({
                        x: cx + (dx * cosA - dy * sinA),
                        y: cy + (dx * sinA + dy * cosA)
                    });

                    const hw = w / 2;
                    const hh = h / 2;

                    // 4 corners of the rectangle
                    bestCorners = [
                        calculateCorner(-hw, -hh),
                        calculateCorner(hw, -hh),
                        calculateCorner(hw, hh),
                        calculateCorner(-hw, hh)
                    ];
                }
            }

            // Clean up OpenCV memory
            cv.clearBuffers();

            if (bestCorners) {
                runOnJsBorderDetected(bestCorners);
            }

        } catch (error) {
            // Silently ignore errors to prevent crashing the camera
            // console.error('Frame processor error:', error);
        }
    }, [runOnJsBorderDetected]);

    return frameProcessor;
};