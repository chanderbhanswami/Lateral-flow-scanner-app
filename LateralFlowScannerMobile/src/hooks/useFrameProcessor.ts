import { useCallback, useMemo } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { OpenCV } from 'react-native-fast-opencv';
import { useResizePlugin } from 'vision-camera-resize-plugin';

// Import Worklet-compatible utilities
import { analyzeBlurWorklet } from '../utils/analysis/blur';
import { analyzeExposureWorklet, calculateHistogramWorklet } from '../utils/analysis/exposure';
import { detectShadowsWorklet } from '../utils/analysis/shadow';
import { detectReflectionsWorklet } from '../utils/analysis/reflection';
import { analyzeBorderWorklet, calculateCornersFromRectWorklet } from '../utils/analysis/border';
import { analyzeColorWorklet } from '../utils/analysis/color';
import { analyzeFocusNeedWorklet } from '../utils/camera/focus';
import { normalizeHistogramWorklet, calculateHistogramStatsWorklet } from '../utils/camera/histogram';
import { analyzeWhiteBalanceWorklet } from '../utils/camera/whiteBalance';
import { assessImageQualityWorklet } from '../utils/image/quality';
import { validateCaptureConditionsWorklet } from '../utils/image/validation';

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

        try {
            const cv = OpenCV as any;

            // Defensive check: Skip if OpenCV is not ready
            if (!cv || !cv.frameBufferToMat) {
                return;
            }

            // Defensive check: Skip if resize is not available
            if (!resize) {
                return;
            }

            // 1. Resize frame for better performance (smaller = faster processing)
            let resized;
            try {
                resized = resize(frame, {
                    scale: {
                        width: 640,
                        height: 480,
                    },
                    pixelFormat: 'rgba',
                    dataType: 'uint8',
                });
            } catch (resizeError) {
                // Silently skip this frame if resize fails
                return;
            }

            if (!resized) {
                return;
            }

            const frameWidth = 640;
            const frameHeight = 480;

            // 2. Convert frame buffer to OpenCV Mat
            const src = cv.frameBufferToMat(
                480,  // height (rows)
                640,  // width (cols)
                4,    // 4 channels for RGBA
                resized
            );

            // 3. Convert RGBA to Grayscale
            const gray = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('cvtColor', src, gray, cv.COLOR_RGBA2GRAY);

            // --- BLUR DETECTION (OpenCV Laplacian) ---
            const laplacian = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('Laplacian', gray, laplacian, cv.CV_8U);

            const meanStdDevMean = cv.createObject(cv.ObjectType.Mat);
            const meanStdDevStd = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('meanStdDev', laplacian, meanStdDevMean, meanStdDevStd);

            const stdDevVal = cv.toJSValue(meanStdDevStd);
            const stdDev = (stdDevVal.val && stdDevVal.val[0]) ? stdDevVal.val[0] : 0;
            const laplacianVariance = stdDev * stdDev;

            // Use utility for blur analysis
            const blurAnalysis = analyzeBlurWorklet(laplacianVariance);
            const focusAnalysis = analyzeFocusNeedWorklet(laplacianVariance);

            // --- HISTOGRAM & EXPOSURE (Manual Loop with Utilities) ---
            const histResult = calculateHistogramWorklet(resized, 2); // Step 2 for speed
            const meanBrightness = histResult.sumBrightness / histResult.pixelCount;

            // Use utilities for exposure analysis
            const exposureAnalysis = analyzeExposureWorklet(
                histResult.brightnessHist,
                meanBrightness,
                histResult.pixelCount
            );

            // Use utilities for color analysis
            const colorAnalysis = analyzeColorWorklet(
                histResult.redHist,
                histResult.greenHist,
                histResult.blueHist,
                histResult.pixelCount
            );

            // Use utilities for white balance
            const meanR = histResult.redHist.reduce((sum, v, i) => sum + i * v, 0) / histResult.pixelCount;
            const meanG = histResult.greenHist.reduce((sum, v, i) => sum + i * v, 0) / histResult.pixelCount;
            const meanB = histResult.blueHist.reduce((sum, v, i) => sum + i * v, 0) / histResult.pixelCount;
            const whiteBalanceAnalysis = analyzeWhiteBalanceWorklet(meanR, meanG, meanB);

            // --- SHADOW & REFLECTION (Using Utilities) ---
            const shadowAnalysis = detectShadowsWorklet(histResult.brightnessHist, histResult.pixelCount);
            const reflectionAnalysis = detectReflectionsWorklet(histResult.brightnessHist, histResult.pixelCount);

            // --- HISTOGRAM STATS (Using Utilities) ---
            const histogramStats = calculateHistogramStatsWorklet(histResult.brightnessHist, histResult.pixelCount);
            const normalizedHist = normalizeHistogramWorklet(histResult.brightnessHist);

            // --- BORDER DETECTION (OpenCV Contours) ---
            cv.invoke('GaussianBlur', gray, gray, { width: 5, height: 5 }, 0);

            const edges = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('Canny', gray, edges, 75, 200);

            const contours = cv.createObject(cv.ObjectType.MatVector);
            const hierarchy = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('findContours', edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            const count = cv.invoke('size', contours);

            let maxArea = 0;
            let bestCorners: Array<{ x: number; y: number }> | null = null;
            const loopLimit = Math.min(count, 20);

            for (let i = 0; i < loopLimit; i++) {
                const contour = cv.invoke('getVector', contours, i);

                const area = cv.invoke('contourArea', contour);
                if (area < 1000) continue;

                const rotatedRect = cv.invoke('minAreaRect', contour);
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
                    // Use utility for corner calculation
                    bestCorners = calculateCornersFromRectWorklet(cx, cy, w, h, ang);
                }
            }

            // Use utility for border analysis
            const borderAnalysis = analyzeBorderWorklet(
                bestCorners || [],
                frameWidth,
                frameHeight
            );

            // --- QUALITY ASSESSMENT (Using Utilities) ---
            const qualityAssessment = assessImageQualityWorklet(
                blurAnalysis.isBlurry,
                blurAnalysis.blurScore,
                exposureAnalysis.isUnderexposed,
                exposureAnalysis.isOverexposed,
                shadowAnalysis.hasShadow,
                reflectionAnalysis.hasReflection,
                borderAnalysis.isCentered,
                borderAnalysis.isAligned
            );

            // --- CAPTURE VALIDATION (Using Utilities) ---
            const captureValidation = validateCaptureConditionsWorklet(
                blurAnalysis.isBlurry,
                exposureAnalysis.isUnderexposed,
                exposureAnalysis.isOverexposed,
                shadowAnalysis.hasShadow,
                reflectionAnalysis.hasReflection,
                borderAnalysis.detected
            );

            // Compile full analysis result
            const analysisResult = {
                // Core analysis
                blurAnalysis,
                exposureAnalysis,
                shadowAnalysis,
                reflectionAnalysis,

                // Extended analysis from utilities
                focusAnalysis,
                colorAnalysis,
                whiteBalanceAnalysis,
                borderAnalysis,
                qualityAssessment,
                captureValidation,

                // Histogram data
                histogram: {
                    brightness: histResult.brightnessHist,
                    red: histResult.redHist,
                    green: histResult.greenHist,
                    blue: histResult.blueHist,
                    normalized: normalizedHist,
                    stats: histogramStats
                }
            };

            // Clean up OpenCV memory
            cv.clearBuffers();

            // Send results to JS thread
            runOnJsQualityAnalysis(analysisResult);
            runOnJsBorderDetected(bestCorners || []);

        } catch (error) {
            console.error('Frame processor error:', error);
        }
    }, [runOnJsBorderDetected, runOnJsQualityAnalysis, resize]);

    return frameProcessor;
};