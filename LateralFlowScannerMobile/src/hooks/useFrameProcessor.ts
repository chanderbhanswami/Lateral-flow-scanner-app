import { useCallback, useMemo } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { OpenCV } from 'react-native-fast-opencv';
import { useResizePlugin } from 'vision-camera-resize-plugin';

export const useCustomFrameProcessor = (
    onBorderDetected: (corners: Array<{ x: number; y: number }>) => void,
    onQualityAnalysis: (analysis: any) => void
) => {
    // Create worklet-callable version of callbacks using worklets-core
    const runOnJsBorderDetected = useMemo(
        () => Worklets.createRunOnJS(onBorderDetected),
        [onBorderDetected]
    );

    const runOnJsQualityAnalysis = useMemo(
        () => Worklets.createRunOnJS(onQualityAnalysis),
        [onQualityAnalysis]
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

            // --- Quality Analysis ---

            // 1. Blur Detection (Laplacian Variance)
            const laplacian = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('Laplacian', gray, laplacian, cv.CV_8U);

            const meanStdDevMean = cv.createObject(cv.ObjectType.Mat);
            const meanStdDevStd = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('meanStdDev', laplacian, meanStdDevMean, meanStdDevStd);

            // Extract variance (stdDev^2)
            const stdDevVal = cv.toJSValue(meanStdDevStd);
            const stdDev = (stdDevVal.val && stdDevVal.val[0]) ? stdDevVal.val[0] : 0;
            const laplacianVariance = stdDev * stdDev;
            const isBlurry = laplacianVariance < 50;

            // 2. Histogram & Exposure (Manual Loop for Control)
            const width = 640;
            const height = 480;
            const brightnessHist = new Array(256).fill(0);
            const redHist = new Array(256).fill(0);
            const greenHist = new Array(256).fill(0);
            const blueHist = new Array(256).fill(0);

            let sumBrightness = 0;
            let pixelCount = 0;
            const step = 8; // Sampling for speed

            for (let i = 0; i < resized.length; i += step) {
                const r = resized[i];
                const g = resized[i + 1];
                const b = resized[i + 2];
                const br = Math.round((r + g + b) / 3);

                redHist[r]++;
                greenHist[g]++;
                blueHist[b]++;
                brightnessHist[br]++;

                sumBrightness += br;
                pixelCount++;
            }

            const meanBrightness = sumBrightness / pixelCount;

            // Exposure Checks
            const isUnderexposed = meanBrightness < 80;
            const isOverexposed = meanBrightness > 200;

            // Reflection: Significant pixels in 250-255 range
            let highLightPixels = 0;
            for (let i = 240; i < 256; i++) highLightPixels += brightnessHist[i];
            const hasReflection = (highLightPixels / pixelCount) > 0.05;

            // Shadow: Significant pixels in 0-20 range
            let shadowPixels = 0;
            for (let i = 0; i < 20; i++) shadowPixels += brightnessHist[i];
            const hasShadow = (shadowPixels / pixelCount) > 0.15;

            const analysisResult = {
                blurAnalysis: {
                    isBlurry: isBlurry,
                    blurScore: laplacianVariance
                },
                exposureAnalysis: {
                    isUnderexposed: isUnderexposed,
                    isOverexposed: isOverexposed,
                    exposureValue: meanBrightness
                },
                shadowAnalysis: { hasShadow: hasShadow },
                reflectionAnalysis: { hasReflection: hasReflection },
                histogram: {
                    brightness: brightnessHist,
                    red: redHist,
                    green: greenHist,
                    blue: blueHist
                }
            };

            runOnJsQualityAnalysis(analysisResult);


            // 4. Blur for edge detection (Pre-processing for Canny)
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

            // Always update detection state - pass empty array if null
            runOnJsBorderDetected(bestCorners || []);

        } catch (error) {
            console.error('Frame processor error:', error);
        }
    }, [runOnJsBorderDetected, runOnJsQualityAnalysis, resize]);

    return frameProcessor;
};