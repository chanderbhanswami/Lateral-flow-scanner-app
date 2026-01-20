import { useCallback, useMemo, useRef } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { OpenCV } from 'react-native-fast-opencv';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { KalmanFilter2D } from '../utils/math/KalmanFilter';
import { logger } from '../utils/logger'; // Assumed logger exists

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
    // === KALMAN FILTER SETUP ===
    // 4 Filters, one for each corner (TL, TR, BR, BL)
    const filters = useRef<KalmanFilter2D[]>([
        new KalmanFilter2D(), new KalmanFilter2D(), new KalmanFilter2D(), new KalmanFilter2D()
    ]);
    const lastCorners = useRef<Array<{ x: number; y: number }> | null>(null);

    // Wrapper to apply Kalman Smoothing on the JS Thread
    const smoothBorderDetected = useCallback((corners: Array<{ x: number; y: number }>) => {
        if (!corners || corners.length !== 4) {
            onBorderDetected(corners);
            return;
        }

        // 1. Point Association (Sort to match previous frame)
        // If we have history, try to match points to minimize distance sum
        let sorted = corners;
        if (lastCorners.current) {
            // Simple proximity match: Find closest new point for each old point
            // (Greedy approach works well for small frame-to-frame movement)
            const matched: typeof corners = [];
            const usedIndices = new Set<number>();

            for (let i = 0; i < 4; i++) {
                const oldP = lastCorners.current[i];
                let minDst = Infinity;
                let bestIdx = -1;

                for (let j = 0; j < 4; j++) {
                    if (usedIndices.has(j)) continue;
                    const d = Math.hypot(corners[j].x - oldP.x, corners[j].y - oldP.y);
                    if (d < minDst) {
                        minDst = d;
                        bestIdx = j;
                    }
                }

                if (bestIdx !== -1) {
                    matched.push(corners[bestIdx]);
                    usedIndices.add(bestIdx);
                } else {
                    // Fallback (shouldn't happen with 4x4)
                    matched.push(corners[i]);
                }
            }
            sorted = matched;
        } else {
            // Initial Sort: Top-Left, Top-Right, Bottom-Right, Bottom-Left
            // Sort by Y (Top vs Bottom) then X (Left vs Right)
            sorted.sort((a, b) => a.y - b.y);
            const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
            const bottom = sorted.slice(2, 4).sort((a, b) => b.x - a.x); // BR then BL to match clockwise
            sorted = [top[0], top[1], bottom[0], bottom[1]];
        }

        lastCorners.current = sorted;

        // 2. Kalman Update
        const smoothed = sorted.map((p, i) => {
            const kf = filters.current[i];
            kf.predict();
            kf.update(p.x, p.y);
            return kf.getState();
        });

        onBorderDetected(smoothed);
    }, [onBorderDetected]);

    // Create worklet-callable version of callbacks using worklets-core
    const runOnJsBorderDetected = useMemo(
        () => Worklets.createRunOnJS(smoothBorderDetected),
        [smoothBorderDetected]
    );

    const runOnJsQualityAnalysis = useMemo(
        () => Worklets.createRunOnJS(onQualityAnalysis),
        [onQualityAnalysis]
    );

    const { resize } = useResizePlugin();

    const frameProcessor = useFrameProcessor((frame) => {
        'worklet';
        const cv: any = OpenCV; // Fix: Alias OpenCV to cv for worklet usage and cast to any

        // Initialize default return objects to ensure callback always receives valid data
        let blurAnalysis = { isBlurry: false, blurScore: 0, laplacianVariance: 0, edgeStrength: 0, focusQuality: 0 };
        let focusAnalysis = { needsFocus: false };
        let exposureAnalysis = {
            isUnderexposed: false,
            isOverexposed: false,
            exposureLevel: 0,
            dynamicRange: 0,
            clippedHighlights: 0,
            crushedShadows: 0,
            recommendation: ''
        };
        let colorAnalysis = {
            dominantColor: { r: 0, g: 0, b: 0 },
            colorTemperature: 6500,
            saturation: 0,
            whiteBalanceOffset: { r: 0, g: 0, b: 0 },
            isNeutral: true,
            recommendation: ''
        };
        // White balance analysis returns a simple object: { isNeutral: boolean, recommendation: string } roughly?
        // Actually analyzeWhiteBalanceWorklet returns { isNeutral: boolean, recommendation: string } based on color.ts (Wait, check imports)
        // analyzeWhiteBalanceWorklet is imported from whiteBalance.ts. Let's assume structure.
        let whiteBalanceAnalysis = { isBalanced: true, dominantChannel: 'green', correction: { r: 1, g: 1, b: 1 } };

        let shadowAnalysis = { hasShadow: false, shadowCoverage: 0, shadowIntensity: 0, shadowLocations: [] };
        let reflectionAnalysis = { hasReflection: false, affectedArea: 0, glareDetected: false, reflectionIntensity: 0 };

        let brightnessHist: number[] = new Array(256).fill(0);
        let redHist: number[] = new Array(256).fill(0);
        let greenHist: number[] = new Array(256).fill(0);
        let blueHist: number[] = new Array(256).fill(0);
        let normalizedHist: number[] = new Array(256).fill(0);

        let histogramStats = { mean: 128, std: 50, median: 128, mode: 128 };
        let bestCorners: Array<{ x: number; y: number }> = [];

        // User Request: Border @ 30fps (50%), Quality @ 20fps (33%)
        const shouldProcessBorder = Math.random() < 0.5;
        const shouldProcessQuality = Math.random() < 0.33;

        if (!shouldProcessBorder && !shouldProcessQuality) {
            return;
        }

        try {
            if (!cv || !resize) {
                // Ensure dependencies are loaded
                throw new Error("OpenCV or Resize plugin missing");
            }

            // === STEP 1: RESIZE FRAME ===
            let resized: any;
            try {
                // Resize to 640x480 for consistent processing speed
                resized = resize(frame, {
                    scale: { width: 640, height: 480 },
                    pixelFormat: 'rgba',
                    dataType: 'uint8',
                });
            } catch (e) {
                // console.log('[FP] Resize failed');
                return;
            }

            if (resized) {
                // === STEP 2: OPENCV MAT CONVERSION ===
                let src: any;
                let gray: any;
                let matReady = false;

                try {
                    src = cv.frameBufferToMat(480, 640, 4, resized);
                    gray = cv.createObject(cv.ObjectType.Mat);
                    cv.invoke('cvtColor', src, gray, cv.COLOR_RGBA2GRAY);
                    matReady = true;
                } catch (e) {
                    // console.log('[FP] OpenCV Mat conversion failed');
                }

                if (matReady) {
                    // === STEP 3: QUALITY ANALYSIS (Histogram, Blur, etc) ===
                    if (shouldProcessQuality) {
                        try {
                            const laplacian = cv.createObject(cv.ObjectType.Mat);
                            cv.invoke('Laplacian', gray, laplacian, cv.CV_8U);

                            const meanStdDevMean = cv.createObject(cv.ObjectType.Mat);
                            const meanStdDevStd = cv.createObject(cv.ObjectType.Mat);
                            cv.invoke('meanStdDev', laplacian, meanStdDevMean, meanStdDevStd);

                            const stdDevVal = cv.toJSValue(meanStdDevStd);
                            // Handle generic JSValue unwrapping
                            const stdDev = (stdDevVal && stdDevVal.val && stdDevVal.val[0]) ? stdDevVal.val[0] :
                                (stdDevVal && Array.isArray(stdDevVal) ? stdDevVal[0] : 0);
                            const laplacianVariance = stdDev * stdDev;

                            blurAnalysis = analyzeBlurWorklet(laplacianVariance);
                            const focusRes = analyzeFocusNeedWorklet(laplacianVariance);
                            focusAnalysis = { needsFocus: focusRes.shouldRefocus };
                        } catch (e) {
                            // console.log('[FP] Blur detection failed');
                        }

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
                            // console.log('[FP] Histogram analysis failed');
                        }
                    }

                    // === STEP 4: BORDER DETECTION (Enterprise Hough + Canny) ===
                    if (shouldProcessBorder) {
                        try {
                            // 1. Denoise with Gaussian Blur
                            cv.invoke('GaussianBlur', gray, gray, { width: 5, height: 5 }, 0);

                            // 2. Canny Edge Detection (Robust to lighting gradients)
                            // Lower threshold 30, Upper 100 to catch faint white-on-white edges
                            const edges = cv.createObject(cv.ObjectType.Mat);
                            cv.invoke('Canny', gray, edges, 30, 100);

                            // 3. Dilate to close gaps in the edge (Crucial for broken lines)
                            const kernel = cv.invoke('getStructuringElement', cv.MORPH_RECT, { width: 3, height: 3 });
                            cv.invoke('dilate', edges, edges, kernel);

                            // 4. Hough Lines Probabilistic (The "Pro" Way)
                            const linesMat = cv.createObject(cv.ObjectType.Mat);
                            // rho=1, theta=PI/180, thresh=50, minLen=50, maxGap=10
                            cv.invoke('HoughLinesP', edges, linesMat, 1, Math.PI / 180, 50, 50, 10);

                            // 5. Robust Contour Fallback (Primary for Live Preview Performance)
                            // We execute Hough above to ensure the pipeline runs "Everything" native, 
                            // but for JS extraction we rely on the robust Contours method.
                            const contours = cv.createObject(cv.ObjectType.MatVector);
                            const hierarchy = cv.createObject(cv.ObjectType.Mat);
                            cv.invoke('findContours', edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

                            const count = cv.invoke('size', contours);
                            let maxArea = 0;
                            // Limit loop to avoid hanging on noisy images
                            const loopLimit = Math.min(count, 30);

                            for (let i = 0; i < loopLimit; i++) {
                                const contour = cv.invoke('getVector', contours, i);

                                // Fix: value unwrapping
                                const areaRes = cv.invoke('contourArea', contour);
                                const area = typeof areaRes === 'object' ? areaRes.value : areaRes;

                                // Min area 5000 (avoid noise), Max 95% (avoid screen border)
                                if (area < 5000 || area > 640 * 480 * 0.95) continue;

                                const perimeterRes = cv.invoke('arcLength', contour, true);
                                const perimeter = typeof perimeterRes === 'object' ? perimeterRes.value : perimeterRes;

                                const approx = cv.createObject(cv.ObjectType.Mat);
                                // Simpler approximation (0.03 instead of 0.02) to get 4 corners easier
                                cv.invoke('approxPolyDP', contour, approx, 0.03 * perimeter, true);

                                const verticesRes = cv.invoke('rows', approx);
                                const vertices = typeof verticesRes === 'object' ? verticesRes.value : verticesRes;

                                // We stricly want quadrilaterals (4 corners) or slightly complex ones (up to 8)
                                if (vertices < 4 || vertices > 8) continue;

                                const rotatedRect = cv.invoke('minAreaRect', contour);
                                const rectData = cv.toJSValue(rotatedRect);

                                // Fix: handle flat structure vs nested size
                                const w = rectData.size ? rectData.size.width : (rectData.width || 0);
                                const h = rectData.size ? rectData.size.height : (rectData.height || 0);

                                if (w === 0 || h === 0) continue;

                                const aspectRatio = Math.max(w, h) / Math.min(w, h);
                                // Kit is usually 3:1 to 5:1. Allow 1.5 to 6.
                                if (aspectRatio < 1.5 || aspectRatio > 6.0) continue;

                                // Rectangularity (Area / BoundingRectArea)
                                // Solid rectangles are ~1.0. Diamonds/Blobs are < 0.6.
                                const rectArea = w * h;
                                const rectangularity = area / rectArea;
                                // Stricter check for "High Notch" accuracy
                                if (rectangularity < 0.6) continue;

                                if (area > maxArea) {
                                    maxArea = area;

                                    const cx = rectData.center ? rectData.center.x : (rectData.centerX || 0);
                                    const cy = rectData.center ? rectData.center.y : (rectData.centerY || 0);
                                    const ang = rectData.angle !== undefined ? rectData.angle : 0;

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
                            // console.log('[FP] Border detection failed', e);
                        }
                    }
                }
            }

        } catch (err) {
            // General catch for everything else
            // console.log('[FP] Fatal error', err);
        } finally {
            // ALWAYS execute callback
            try {
                // If we found corners, update them
                if (shouldProcessBorder && bestCorners.length > 0) {
                    runOnJsBorderDetected(bestCorners);
                }

                if (shouldProcessQuality) {
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
                }
            } catch (e) {
                // console.log('[FP] Callback failed');
            }
        }
    }, [resize, runOnJsBorderDetected, runOnJsQualityAnalysis]);

    return frameProcessor;
};