import { useCallback, useMemo, useRef } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { OpenCV } from 'react-native-fast-opencv';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { KalmanFilter2D } from '../utils/math/KalmanFilter';
import { logger } from '../utils/logger';

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
        let sorted = corners;
        if (lastCorners.current) {
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
                    matched.push(corners[i]);
                }
            }
            sorted = matched;
        } else {
            // Initial Sort: Top-Left, Top-Right, Bottom-Right, Bottom-Left
            sorted.sort((a, b) => a.y - b.y);
            const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
            const bottom = sorted.slice(2, 4).sort((a, b) => b.x - a.x);
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

    const runOnJsLog = useMemo(() => Worklets.createRunOnJS((msg: string) => {
        logger.warn(msg);
    }), []);

    const runOnJsError = useMemo(() => Worklets.createRunOnJS((msg: string) => {
        console.error(msg);
    }), []);

    const { resize } = useResizePlugin();

    const frameProcessor = useFrameProcessor((frame) => {
        'worklet';
        const cv: any = OpenCV;

        // Initialize default return objects
        let blurAnalysis = { isBlurry: false, blurScore: 0, laplacianVariance: 0, edgeStrength: 0, focusQuality: 0 };
        let focusAnalysis = { needsFocus: false };
        let exposureAnalysis = {
            isUnderexposed: false, isOverexposed: false, exposureLevel: 0, dynamicRange: 0,
            clippedHighlights: 0, crushedShadows: 0, recommendation: ''
        };
        let colorAnalysis = {
            dominantColor: { r: 0, g: 0, b: 0 }, colorTemperature: 6500, saturation: 0,
            whiteBalanceOffset: { r: 0, g: 0, b: 0 }, isNeutral: true, recommendation: ''
        };
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

        // Force logging to JS thread for visibility
        if (Math.random() < 0.01) {
            runOnJsLog(`[FP] Alive. Res: ${frame.width}x${frame.height} | Border: ${shouldProcessBorder} | Quality: ${shouldProcessQuality}`);
        }

        if (!shouldProcessBorder && !shouldProcessQuality) {
            return;
        }

        try {
            if (!cv || !resize) {
                runOnJsError(`[FP] CRITICAL: Missing Deps - CV: ${!!cv}, Resize: ${!!resize}`);
                throw new Error("OpenCV or Resize plugin missing");
            }

            // === STEP 1: RESIZE FRAME ===
            // FIX: Switch to PORTRAIT Mode (480x640) because the App is Portrait.
            // Previous 640x480 (Landscape) caused stretching and angle distortion.
            const TARGET_WIDTH = 480;
            const TARGET_HEIGHT = 640;

            let resized: any;
            try {
                // Resize plugin expects a valid view. If view is destroyed (navigating away), this throws.
                resized = resize(frame, {
                    scale: { width: TARGET_WIDTH, height: TARGET_HEIGHT },
                    pixelFormat: 'rgba',
                    dataType: 'uint8',
                });
            } catch (e: any) {
                // IGNORE ViewNotFoundError - this is expected during navigation/unmount
                if (e.message?.includes('ViewNotFoundError') || e.message?.includes('VisionCameraProxy')) {
                    // runOnJsLog('[FP] View detached, skipping frame');
                    return;
                }
                runOnJsError(`[FP] Resize failed: ${e}`);
                return;
            }

            if (resized) {
                // === STEP 2: OPENCV MAT CONVERSION ===
                let src: any;
                let gray: any;
                let matReady = false;

                try {
                    src = cv.frameBufferToMat(TARGET_HEIGHT, TARGET_WIDTH, 4, resized); // Note: Rows=Height, Cols=Width
                    gray = cv.createObject('mat', TARGET_HEIGHT, TARGET_WIDTH, 0); // CV_8U = 0
                    cv.invoke('cvtColor', src, gray, 11); // COLOR_RGBA2GRAY = 11
                    matReady = true;
                    // runOnJsLog('[FP] Mat Ready');
                } catch (e) {
                    runOnJsError(`[FP] Mat conversion failed: ${e}`);
                }

                if (matReady) {
                    // === STEP 3: QUALITY ANALYSIS ===
                    if (shouldProcessQuality) {
                        try {
                            const laplacian = cv.createObject('mat', TARGET_HEIGHT, TARGET_WIDTH, 0); // CV_8U = 0
                            // Laplacian args: src, dst, ddepth(0=8U), ksize(1), scale(1), delta(0), borderType(4=DEFAULT)
                            cv.invoke('Laplacian', gray, laplacian, 0, 1, 1, 0, 4);

                            const meanStdDevMean = cv.createObject('mat', 0, 0, 6); // CV_64F = 6 (Empty)
                            const meanStdDevStd = cv.createObject('mat', 0, 0, 6); // CV_64F = 6 (Empty)
                            cv.invoke('meanStdDev', laplacian, meanStdDevMean, meanStdDevStd);

                            const stdDevVal = cv.toJSValue(meanStdDevStd);
                            const stdDev = (stdDevVal && stdDevVal.val && stdDevVal.val[0]) ? stdDevVal.val[0] :
                                (stdDevVal && Array.isArray(stdDevVal) ? stdDevVal[0] : 0);
                            const laplacianVariance = stdDev * stdDev;

                            blurAnalysis = analyzeBlurWorklet(laplacianVariance);
                            const focusRes = analyzeFocusNeedWorklet(laplacianVariance);
                            focusAnalysis = { needsFocus: focusRes.shouldRefocus };

                            // CHECKPOINT 1: Blur
                            // runOnJsLog(`[FP] Blur: ${blurAnalysis.isBlurry} val: ${laplacianVariance}`);
                        } catch (e) {
                            runOnJsError(`[FP] Blur Analysis Error: ${e}`);
                        }

                        try {
                            const histResult = calculateHistogramWorklet(resized, 2);
                            if (!histResult) throw new Error("Histogram result is null");

                            redHist = histResult.redHist;
                            greenHist = histResult.greenHist;
                            blueHist = histResult.blueHist;
                            const meanBrightness = histResult.sumBrightness / histResult.pixelCount;
                            brightnessHist = histResult.brightnessHist;

                            // CHECKPOINT 2: Histogram Computed
                            // runOnJsLog(`[FP] Hist Mean: ${meanBrightness}`);

                            exposureAnalysis = analyzeExposureWorklet(histResult.brightnessHist, meanBrightness, histResult.pixelCount);
                            colorAnalysis = analyzeColorWorklet(histResult.redHist, histResult.greenHist, histResult.blueHist, histResult.pixelCount);

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

                            // CHECKPOINT 3: Analysis Complete
                        } catch (e) {
                            runOnJsError(`[FP] Quality Analysis Error: ${e}`);
                        }
                    }

                    // === STEP 4: BORDER DETECTION (Enterprise Hough + RANSAC) ===
                    if (shouldProcessBorder) {
                        try {
                            // 1. Denoise
                            const ksize5 = cv.createObject('size', 5, 5);
                            cv.invoke('GaussianBlur', gray, gray, ksize5, 0);

                            // 2. Canny (Tightened Thresholds)
                            // Was 30, 100. Increasing to 50, 150 to ignore faint background noise.
                            const edges = cv.createObject('mat', TARGET_HEIGHT, TARGET_WIDTH, 0);
                            cv.invoke('Canny', gray, edges, 50, 150);

                            // 3. Dilate
                            const ksize3 = cv.createObject('size', 3, 3);
                            const kernel = cv.invoke('getStructuringElement', 0, ksize3);
                            cv.invoke('morphologyEx', edges, edges, 1, kernel);

                            // 4. Hough Lines Probabilistic (Stricter)
                            // threshold: 50 -> 80 (More votes needed)
                            // minLineLength: 50 -> 60 (Longer lines only)
                            // maxLineGap: 10 -> 20 (Allow gaps for broken cassette edges)
                            const linesMat = cv.createObject('mat', 0, 0, 4);
                            cv.invoke('HoughLinesP', edges, linesMat, 1, Math.PI / 180, 80, 60, 20);

                            const linesInfo = cv.toJSValue(linesMat);
                            const lineCount = linesInfo.rows;

                            // 5. Enterprise Logic: Clustering & RANSAC Line Fitting
                            // --- HELPERS ---
                            const distSq = (p1: { x: number, y: number }, p2: { x: number, y: number }) =>
                                (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;

                            const computeIntersect = (l1: { m: number, c: number, vertical: boolean, x?: number }, l2: { m: number, c: number, vertical: boolean, x?: number }) => {
                                if (l1.vertical && l2.vertical) return null;
                                if (l1.vertical) return { x: l1.x!, y: l2.m * l1.x! + l2.c };
                                if (l2.vertical) return { x: l2.x!, y: l1.m * l2.x! + l1.c };

                                const det = l1.m - l2.m;
                                if (Math.abs(det) < 0.001) return null;
                                const x = (l2.c - l1.c) / det;
                                const y = l1.m * x + l1.c;
                                return { x, y };
                            };

                            // RANSAC Line Fitting (Robust to outliers)
                            const fitLineToPoints = (points: { x: number, y: number }[]) => {
                                const n = points.length;
                                if (n < 2) return null;
                                if (n === 2) {
                                    const p1 = points[0], p2 = points[1];
                                    if (Math.abs(p1.x - p2.x) < 1) return { vertical: true, x: p1.x, m: 0, c: 0 };
                                    const m = (p2.y - p1.y) / (p2.x - p1.x);
                                    return { m, c: p1.y - m * p1.x, vertical: false };
                                }

                                let bestLine = null;
                                let maxInliers = -1;
                                const iterations = 20;
                                const threshold = 5.0;

                                for (let i = 0; i < iterations; i++) {
                                    const idx1 = Math.floor(Math.random() * n);
                                    let idx2 = Math.floor(Math.random() * n);
                                    if (idx1 === idx2) idx2 = (idx1 + 1) % n;

                                    const p1 = points[idx1];
                                    const p2 = points[idx2];
                                    let m = 0, c = 0, vertical = false, xVal = 0;

                                    if (Math.abs(p1.x - p2.x) < 1) {
                                        vertical = true;
                                        xVal = p1.x;
                                    } else {
                                        m = (p2.y - p1.y) / (p2.x - p1.x);
                                        c = p1.y - m * p1.x;
                                    }

                                    let inliers = 0;
                                    for (const p of points) {
                                        let dist = 0;
                                        if (vertical) dist = Math.abs(p.x - xVal);
                                        else dist = Math.abs(m * p.x - p.y + c) / Math.sqrt(m * m + 1);
                                        if (dist < threshold) inliers++;
                                    }

                                    if (inliers > maxInliers) {
                                        maxInliers = inliers;
                                        bestLine = { m, c, vertical, x: xVal };
                                    }
                                }
                                return bestLine;
                            };

                            // Arrays
                            const ptsTop: { x: number, y: number }[] = [];
                            const ptsBottom: { x: number, y: number }[] = [];
                            const ptsLeft: { x: number, y: number }[] = [];
                            const ptsRight: { x: number, y: number }[] = [];

                            const centerX = TARGET_WIDTH / 2;
                            const centerY = TARGET_HEIGHT / 2;

                            const maxLines = Math.min(lineCount, 50);
                            const lineDataObj = cv.matToBuffer(linesMat, 'int32');
                            const lineData = lineDataObj.buffer;

                            if (lineData) {
                                for (let i = 0; i < maxLines; i++) {
                                    if (lineData.length < (i * 4) + 4) break;
                                    const x1 = lineData[i * 4];
                                    const y1 = lineData[i * 4 + 1];
                                    const x2 = lineData[i * 4 + 2];
                                    const y2 = lineData[i * 4 + 3];

                                    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
                                    const midX = (x1 + x2) / 2;
                                    const midY = (y1 + y2) / 2;

                                    if (Math.abs(angle) < 45 || Math.abs(angle) > 135) {
                                        if (midY < centerY) { ptsTop.push({ x: x1, y: y1 }); ptsTop.push({ x: x2, y: y2 }); }
                                        else { ptsBottom.push({ x: x1, y: y1 }); ptsBottom.push({ x: x2, y: y2 }); }
                                    } else {
                                        if (midX < centerX) { ptsLeft.push({ x: x1, y: y1 }); ptsLeft.push({ x: x2, y: y2 }); }
                                        else { ptsRight.push({ x: x1, y: y1 }); ptsRight.push({ x: x2, y: y2 }); }
                                    }
                                }
                            }

                            if (ptsTop.length >= 4 && ptsBottom.length >= 4 && ptsLeft.length >= 4 && ptsRight.length >= 4) {
                                const lTop = fitLineToPoints(ptsTop);
                                const lBottom = fitLineToPoints(ptsBottom);
                                const lLeft = fitLineToPoints(ptsLeft);
                                const lRight = fitLineToPoints(ptsRight);

                                if (lTop && lBottom && lLeft && lRight) {
                                    const tl = computeIntersect(lTop, lLeft);
                                    const tr = computeIntersect(lTop, lRight);
                                    const br = computeIntersect(lBottom, lRight);
                                    const bl = computeIntersect(lBottom, lLeft);

                                    if (tl && tr && br && bl) {
                                        // 6. Enterprise Geometric Validation
                                        // Sort corners spatially to prevent "Bowtie" / Crossed shapes
                                        // Standard order: TL, TR, BR, BL
                                        const pts = [tl, tr, br, bl];

                                        // 1. Sort by Y (Top vs Bottom)
                                        pts.sort((a, b) => a.y - b.y);
                                        const topPts = pts.slice(0, 2).sort((a, b) => a.x - b.x); // TL, TR
                                        const botPts = pts.slice(2, 4).sort((a, b) => b.x - a.x); // BR, BL (Note: BR first for clockwise, or standard sort for grid?)

                                        // Re-assign strict geometric corners
                                        const sTL = topPts[0];
                                        const sTR = topPts[1];
                                        const sBR = botPts[0]; // Wait, let's keep standard TL, TR, BR, BL order for winding
                                        const sBL = botPts[1];

                                        // Corrections: bottom points sorted by X descending means BR is index 0?
                                        // Let's stick to X ascending for simplicity
                                        const botPtsAsc = pts.slice(2, 4).sort((a, b) => a.x - b.x); // BL, BR
                                        const nBL = botPtsAsc[0];
                                        const nBR = botPtsAsc[1];

                                        const wTop = Math.sqrt(distSq(sTL, sTR));
                                        const wBot = Math.sqrt(distSq(nBL, nBR));
                                        const hLeft = Math.sqrt(distSq(sTL, nBL));
                                        const hRight = Math.sqrt(distSq(sTR, nBR));

                                        const avgW = (wTop + wBot) / 2;
                                        const avgH = (hLeft + hRight) / 2;

                                        // Validation 1: Size (Increase min size to avoid small noise)
                                        if (avgW > 100 && avgH > 40) {
                                            const aspectRatio = Math.max(avgW, avgH) / Math.min(avgW, avgH);

                                            // Validation 2: Aspect Ratio (TIGHTENED)
                                            // TV/Monitors = 1.77 (16:9). Cassettes = 2.5 - 5.0.
                                            // Setting min to 2.0 filters out almost all screens & square items.
                                            if (aspectRatio > 2.0 && aspectRatio < 8.0) {

                                                // Validation 3: Parallelism Check (Avoid random crossed lines)
                                                // Check if top/bottom slopes are somewhat similar
                                                const slopeTop = Math.abs((sTR.y - sTL.y) / (sTR.x - sTL.x + 0.001));
                                                const slopeBot = Math.abs((nBR.y - nBL.y) / (nBR.x - nBL.x + 0.001));

                                                // Allow small skew (perspective), but huge difference means random lines
                                                if (Math.abs(slopeTop - slopeBot) < 0.5) {
                                                    // NORMALIZE COORDINATES TO 0-1 RANGE
                                                    // This fixes the 640x480 vs Screen Size mismatch
                                                    const width = 640;
                                                    const height = 480;

                                                    bestCorners = [
                                                        { x: sTL.x / width, y: sTL.y / height },
                                                        { x: sTR.x / width, y: sTR.y / height },
                                                        { x: nBR.x / width, y: nBR.y / height },
                                                        { x: nBL.x / width, y: nBL.y / height }
                                                    ];
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            runOnJsError(`[FP] Border detection failed: ${e}`);
                        }
                    }
                }
            }
        } catch (err) {
            runOnJsError(`[FP] Fatal Error: ${err}`);
        } finally {
            try {
                runOnJsLog(`[FP] Finally: Border=${shouldProcessBorder} Corners=${bestCorners.length}, Quality=${shouldProcessQuality}`);

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
                        histogram: { brightness: brightnessHist, red: redHist, green: greenHist, blue: blueHist },
                        histogramStats,
                        normalizedHistogram: normalizedHist,
                    });
                }
            } catch (e) {
                runOnJsError(`[FP] Callback Error: ${e}`);
            }
        }
    }, [resize, runOnJsBorderDetected, runOnJsQualityAnalysis]);

    return frameProcessor;
};