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
import { analyzeColorWorklet } from '../utils/analysis/color';
import { analyzeFocusNeedWorklet } from '../utils/camera/focus';
import { normalizeHistogramWorklet, calculateHistogramStatsWorklet } from '../utils/camera/histogram';
import { analyzeWhiteBalanceWorklet, suggestWhiteBalanceCorrectionWorklet } from '../utils/camera/whiteBalance';

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

        // Check prerequisites
        const cv = OpenCV as any;
        if (!cv || !cv.frameBufferToMat || !resize) {
            return;
        }

        // === STEP 1: RESIZE FRAME ===
        let resized: any;
        try {
            resized = resize(frame, {
                scale: { width: 640, height: 480 },
                pixelFormat: 'rgba',
                dataType: 'uint8',
            });
            if (!resized) return;
        } catch (e) {
            console.log('[FP] Resize failed');
            return;
        }

        // === STEP 2: OPENCV MAT CONVERSION ===
        let src: any;
        let gray: any;
        try {
            src = cv.frameBufferToMat(480, 640, 4, resized);
            gray = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('cvtColor', src, gray, cv.COLOR_RGBA2GRAY);
        } catch (e) {
            console.log('[FP] OpenCV Mat conversion failed');
            return;
        }

        // === STEP 3: BLUR DETECTION ===
        let blurAnalysis = { isBlurry: false, blurScore: 100, laplacianVariance: 0 };
        let focusAnalysis = { needsFocus: false };
        try {
            const laplacian = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('Laplacian', gray, laplacian, cv.CV_8U);

            const meanStdDevMean = cv.createObject(cv.ObjectType.Mat);
            const meanStdDevStd = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('meanStdDev', laplacian, meanStdDevMean, meanStdDevStd);

            const stdDevVal = cv.toJSValue(meanStdDevStd);
            const stdDev = (stdDevVal && stdDevVal.val && stdDevVal.val[0]) ? stdDevVal.val[0] : 0;
            const laplacianVariance = stdDev * stdDev;

            blurAnalysis = analyzeBlurWorklet(laplacianVariance);
            const focusRes = analyzeFocusNeedWorklet(laplacianVariance);
            focusAnalysis = { needsFocus: focusRes.shouldRefocus };
        } catch (e) {
            console.log('[FP] Blur detection failed');
        }

        // === STEP 4: HISTOGRAM & EXPOSURE ===
        let exposureAnalysis = { isUnderexposed: false, isOverexposed: false, exposureLevel: 0.5, dynamicRange: 0.8, clippedHighlights: 0, crushedShadows: 0, recommendation: '' };
        let colorAnalysis = { dominantColor: { r: 128, g: 128, b: 128 }, colorTemperature: 6500, saturation: 0.5, whiteBalanceOffset: { r: 0, g: 0, b: 0 }, isNeutral: true, recommendation: '' };
        let whiteBalanceAnalysis = { isBalanced: true, dominantChannel: 'none', correction: { r: 1, g: 1, b: 1 } };
        let shadowAnalysis = { hasShadow: false, shadowIntensity: 0, shadowCoverage: 0, shadowLocations: [] };
        let reflectionAnalysis = { hasReflection: false, reflectionIntensity: 0, affectedArea: 0, glareDetected: false };
        let histogramStats = { mean: 128, std: 50, median: 128, mode: 128 };
        let normalizedHist: number[] = [];
        let brightnessHist: number[] = [];
        let redHist: number[] = [];
        let greenHist: number[] = [];
        let blueHist: number[] = [];

        try {
            const histResult = calculateHistogramWorklet(resized, 2);
            redHist = histResult.redHist;
            greenHist = histResult.greenHist;
            blueHist = histResult.blueHist;
            const meanBrightness = histResult.sumBrightness / histResult.pixelCount;
            brightnessHist = histResult.brightnessHist;

            exposureAnalysis = analyzeExposureWorklet(
                histResult.brightnessHist,
                meanBrightness,
                histResult.pixelCount
            );

            colorAnalysis = analyzeColorWorklet(
                histResult.redHist,
                histResult.greenHist,
                histResult.blueHist,
                histResult.pixelCount
            );

            // Calculate mean RGB using for-loops (worklet-safe)
            let meanRSum = 0, meanGSum = 0, meanBSum = 0;
            for (let i = 0; i < 256; i++) {
                meanRSum += i * (histResult.redHist[i] || 0);
                meanGSum += i * (histResult.greenHist[i] || 0);
                meanBSum += i * (histResult.blueHist[i] || 0);
            }
            const meanR = meanRSum / histResult.pixelCount;
            const meanG = meanGSum / histResult.pixelCount;
            const meanB = meanBSum / histResult.pixelCount;

            const wbAnalysis = analyzeWhiteBalanceWorklet(meanR, meanG, meanB);
            const correction = suggestWhiteBalanceCorrectionWorklet(meanR, meanG, meanB);

            // Determine dominant channel
            let dominantChannel = 'green';
            if (meanR > meanG && meanR > meanB) dominantChannel = 'red';
            else if (meanB > meanR && meanB > meanG) dominantChannel = 'blue';

            whiteBalanceAnalysis = {
                isBalanced: wbAnalysis.isNeutral,
                dominantChannel,
                correction: { r: correction.rGain, g: correction.gGain, b: correction.bGain }
            };

            const shadowRes = detectShadowsWorklet(histResult.brightnessHist, histResult.pixelCount);
            shadowAnalysis = {
                hasShadow: shadowRes.hasShadow,
                shadowCoverage: shadowRes.shadowCoverage,
                shadowIntensity: 0,
                shadowLocations: []
            };

            const reflectRes = detectReflectionsWorklet(histResult.brightnessHist, histResult.pixelCount);
            reflectionAnalysis = {
                hasReflection: reflectRes.hasReflection,
                affectedArea: reflectRes.affectedArea,
                glareDetected: reflectRes.glareDetected,
                reflectionIntensity: reflectRes.reflectionIntensity
            };

            histogramStats = calculateHistogramStatsWorklet(histResult.brightnessHist, histResult.pixelCount);
            normalizedHist = normalizeHistogramWorklet(histResult.brightnessHist);
        } catch (e) {
            console.log('[FP] Histogram analysis failed');
        }

        // === STEP 5: BORDER DETECTION ===
        let bestCorners: Array<{ x: number; y: number }> = [];
        try {
            // 1. Pre-processing: Gaussian Blur to reduce noise
            cv.invoke('GaussianBlur', gray, gray, { width: 5, height: 5 }, 0);

            // 2. Adaptive Thresholding: Better for varying lighting than Canny
            const edges = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('adaptiveThreshold', gray, edges, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 2);

            // 3. Morphology: Close gaps in edges (Increased kernel size to merge improved segments)
            const kernel = cv.invoke('getStructuringElement', cv.MORPH_RECT, { width: 5, height: 5 });
            cv.invoke('morphologyEx', edges, edges, cv.MORPH_CLOSE, kernel);

            // 4. Find Contours
            const contours = cv.createObject(cv.ObjectType.MatVector);
            const hierarchy = cv.createObject(cv.ObjectType.Mat);
            cv.invoke('findContours', edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            const count = cv.invoke('size', contours);
            let maxArea = 0;
            // Iterate all contours, not just first 20 (though usually few external ones exist)
            const loopLimit = Math.min(count, 50);

            for (let i = 0; i < loopLimit; i++) {
                const contour = cv.invoke('getVector', contours, i);
                const area = cv.invoke('contourArea', contour);

                // Filter 1: Area (too small = noise, too big = whole screen)
                if (area < 5000 || area > 640 * 480 * 0.95) continue;

                // Filter 2: Shape Approximation (Polygon)
                const perimeter = cv.invoke('arcLength', contour, true);
                const approx = cv.createObject(cv.ObjectType.Mat);
                cv.invoke('approxPolyDP', contour, approx, 0.02 * perimeter, true);

                // Get vertices count
                const vertices = cv.invoke('rows', approx); // Mat of shape (N, 1, 2)

                // We expect roughly 4 corners for a cassette, but noise/labels can add vertices
                if (vertices < 4 || vertices > 12) continue;

                // Filter 3: Bounding Rect features
                const rotatedRect = cv.invoke('minAreaRect', contour);
                const rectData = cv.toJSValue(rotatedRect);
                const size = rectData.size || { width: rectData.width || 0, height: rectData.height || 0 };
                const w = size.width || 0;
                const h = size.height || 0;

                if (w === 0 || h === 0) continue;

                const aspectRatio = Math.max(w, h) / Math.min(w, h);
                const rectArea = w * h;

                // Filter 4: Rectangularity (detected contour area vs bbox area)
                const rectangularity = area / rectArea;

                // Strict Checks (Relaxed for better detection):
                // - Aspect Ratio: typical cassette is ~2:1 to ~5:1. 
                // - Rectangularity: allowed slightly lower
                if (aspectRatio < 1.2 || aspectRatio > 8.0) continue;
                if (rectangularity < 0.6) continue;

                // If this is the largest valid kit-like object found so far
                if (area > maxArea) {
                    maxArea = area;

                    const center = rectData.center || { x: rectData.centerX || 0, y: rectData.centerY || 0 };
                    const ang = rectData.angle !== undefined ? rectData.angle : 0;
                    const cx = center.x || 0;
                    const cy = center.y || 0;

                    const angleRad = (ang * Math.PI) / 180;
                    const cos = Math.cos(angleRad);
                    const sin = Math.sin(angleRad);
                    const hw = w / 2;
                    const hh = h / 2;

                    bestCorners = [
                        { x: cx + (-hw * cos - (-hh) * sin), y: cy + (-hw * sin + (-hh) * cos) },
                        { x: cx + (hw * cos - (-hh) * sin), y: cy + (hw * sin + (-hh) * cos) },
                        { x: cx + (hw * cos - hh * sin), y: cy + (hw * sin + hh * cos) },
                        { x: cx + (-hw * cos - hh * sin), y: cy + (-hw * sin + hh * cos) }
                    ];
                }
            }
        } catch (e) {
            console.log('[FP] Border detection failed');
        }

        // === STEP 6: SEND RESULTS ===
        try {
            runOnJsBorderDetected(bestCorners);

            runOnJsQualityAnalysis({
                blurAnalysis,
                focusAnalysis,
                exposureAnalysis,
                colorAnalysis,
                whiteBalanceAnalysis,
                shadowAnalysis,
                reflectionAnalysis,
                histogram: {
                    brightness: brightnessHist,
                    red: redHist,
                    green: greenHist,
                    blue: blueHist,
                },
                histogramStats,
                normalizedHistogram: normalizedHist,
            });
        } catch (e) {
            console.log('[FP] Callback failed');
        }

    }, [resize, runOnJsBorderDetected, runOnJsQualityAnalysis]);

    return frameProcessor;
};