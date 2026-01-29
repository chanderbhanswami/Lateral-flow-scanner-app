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
    onBorderDetected: (data: { corners: Array<{ x: number; y: number }>, sourceWidth: number, sourceHeight: number }) => void,
    onQualityAnalysis: (analysis: any) => void
) => {
    // === KALMAN FILTER SETUP ===
    // 4 Filters, one for each corner (TL, TR, BR, BL)
    const filters = useRef<KalmanFilter2D[]>([
        new KalmanFilter2D(), new KalmanFilter2D(), new KalmanFilter2D(), new KalmanFilter2D()
    ]);
    const lastCorners = useRef<Array<{ x: number; y: number }> | null>(null);

    // ENHANCEMENT 3.2: Multi-Scale Detection - Frame counter for adaptive scale selection
    const frameCounter = useRef<number>(0);

    // Wrapper to apply Kalman Smoothing on the JS Thread
    const smoothBorderDetected = useCallback((data: { corners: Array<{ x: number; y: number }>, sourceWidth: number, sourceHeight: number }) => {
        const { corners, sourceWidth, sourceHeight } = data;

        if (!corners || corners.length !== 4) {
            onBorderDetected(data);
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

        // Pass dimensions along with smoothed corners
        onBorderDetected({ corners: smoothed, sourceWidth, sourceHeight });
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

        // FIX: Revert to LANDSCAPE Mode (640x480) match Native Sensor.
        // We handled the rotation dynamically in the Detection Step.
        const TARGET_WIDTH = 640;
        const TARGET_HEIGHT = 480;

        let bestCorners: Array<{ x: number; y: number }> = [];

        // OPTIMIZED: Border @ 30fps (Every frame), Quality @ 10fps
        // Revert 50% throttle - User reported lag/unresponsiveness with random skip
        const shouldProcessBorder = true;
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
            // FIX: Revert to LANDSCAPE Mode (640x480) match Native Sensor.
            // We handled the rotation dynamically in the Detection Step.
            const TARGET_WIDTH = 640;
            const TARGET_HEIGHT = 480;

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
                const msg = e.toString();
                if (msg.includes('ViewNotFoundError') ||
                    msg.includes('VisionCameraProxy') ||
                    msg.includes('not found in the view manager')) {
                    // runOnJsLog('[FP] View detached, skipping frame');
                    return;
                }
                runOnJsError(`[FP] Resize failed: ${msg}`);
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
                            // ENHANCEMENT 3.2: Multi-Scale Detection
                            // Process at 3 scales to detect kits at varying distances
                            // Scale 0.5x: Detects far-away kits (smaller in frame)
                            // Scale 1.0x: Normal detection (baseline)
                            // Scale 2.0x: Detects close-up kits (larger in frame)

                            // Helper: Compute adaptive Canny thresholds
                            const computeAdaptiveCannyThresholds = () => {
                                let cannyLower = 35;
                                let cannyUpper = 105;

                                // Calculate median brightness from histogram for adaptive thresholding
                                if (brightnessHist && brightnessHist.length === 256) {
                                    let totalPixels = 0;
                                    for (let i = 0; i < 256; i++) {
                                        totalPixels += brightnessHist[i];
                                    }

                                    // Find median (50th percentile)
                                    let cumulativeSum = 0;
                                    let median = 128; // Default fallback
                                    for (let i = 0; i < 256; i++) {
                                        cumulativeSum += brightnessHist[i];
                                        if (cumulativeSum >= totalPixels / 2) {
                                            median = i;
                                            break;
                                        }
                                    }

                                    // Adaptive thresholds using Otsu-like method
                                    const sigma = 0.33;
                                    cannyLower = Math.floor(Math.max(0, (1.0 - sigma) * median));
                                    cannyUpper = Math.floor(Math.min(255, (1.0 + sigma) * median));

                                    // SAFETY CLAMP: Prevent extreme values that break detection
                                    // STABILITY FIX: Narrowed range to prevent "random" noise detection on dark surfaces
                                    cannyLower = Math.max(30, Math.min(cannyLower, 100));   // Min 30 (was 40), Max 100
                                    cannyUpper = Math.max(100, Math.min(cannyUpper, 200));  // Min 100 (was 80), Max 200

                                    // Ensure Gap
                                    if (cannyUpper < cannyLower + 50) cannyUpper = cannyLower + 50;

                                }

                                return { cannyLower, cannyUpper };
                            };

                            const { cannyLower, cannyUpper } = computeAdaptiveCannyThresholds();

                            // 1. Denoise (OPTIMIZED: Bilateral filter for edge-preserving smoothing)
                            // 3x3 Gaussian was adequate but bilateral preserves sharp edges better
                            const ksize3 = cv.createObject('size', 3, 3);
                            cv.invoke('GaussianBlur', gray, gray, ksize3, 0);

                            // 2. ADAPTIVE CANNY (Enhancement 3.1): Auto-compute thresholds from histogram
                            // This makes edge detection robust to varying lighting conditions
                            const edges = cv.createObject('mat', TARGET_HEIGHT, TARGET_WIDTH, 0);
                            cv.invoke('Canny', gray, edges, cannyLower, cannyUpper);

                            // 3. Dilate
                            const kernel = cv.invoke('getStructuringElement', 0, ksize3);
                            cv.invoke('morphologyEx', edges, edges, 1, kernel);

                            // ENHANCEMENT 3.2: Multi-Scale Detection Helper
                            // Performs detection at a specific scale and returns corners + confidence
                            const detectAtScale = (scaleFactor: number, edgeMap: any) => {
                                let scaledEdges = edgeMap;
                                let scaleWidth = TARGET_WIDTH;
                                let scaleHeight = TARGET_HEIGHT;

                                // Resize edge map if scale != 1.0
                                if (scaleFactor !== 1.0) {
                                    scaleWidth = Math.round(TARGET_WIDTH * scaleFactor);
                                    scaleHeight = Math.round(TARGET_HEIGHT * scaleFactor);
                                    const newSize = cv.createObject('size', scaleWidth, scaleHeight);
                                    scaledEdges = cv.createObject('mat', scaleHeight, scaleWidth, 0);
                                    cv.invoke('resize', edgeMap, scaledEdges, newSize, 0, 0, 1); // INTER_LINEAR
                                }

                                // 4. Hough Lines Probabilistic (Scale-adjusted parameters)
                                const minLineLength = Math.round(50 * scaleFactor);
                                const maxLineGap = Math.round(15 * scaleFactor);
                                const linesMat = cv.createObject('mat', 0, 0, 4);
                                cv.invoke('HoughLinesP', scaledEdges, linesMat, 1, Math.PI / 180, 35, minLineLength, maxLineGap);

                                const linesInfo = cv.toJSValue(linesMat);
                                const lineCount = linesInfo.rows;

                                return { linesMat, lineCount, scaleWidth, scaleHeight, scaleFactor };
                            };

                            // Try multiple scales: baseline (1.0x), far (0.5x), close (2.0x)
                            // Adaptive strategy: Cycle through scales every frame to ensure coverage
                            const allScaleResults: Array<{
                                corners: Array<{ x: number; y: number }>;
                                confidence: number;
                                scale: number;
                                avgWidth: number;
                                avgHeight: number;
                            }> = [];

                            // Active Cycling: DISABLED (Lock to 1.0 for stability)
                            let targetScale = 1.0;
                            // if (frameCounter.current % 3 === 1) targetScale = 0.5;
                            // if (frameCounter.current % 3 === 2) targetScale = 2.0;

                            const baselineResult = detectAtScale(targetScale, edges);
                            let linesMat = baselineResult.linesMat;
                            let lineCount = baselineResult.lineCount;
                            let currentScale = baselineResult.scaleFactor;
                            let currentScaleWidth = baselineResult.scaleWidth;
                            let currentScaleHeight = baselineResult.scaleHeight;

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
                                // CRITICAL FIX (Bug #1): Increase RANSAC iterations for 99% confidence
                                // Formula: N ≥ log(1-p)/log(1-w^s) where p=0.99, w=0.5 (50% outliers), s=2
                                // Result: N ≥ log(0.01)/log(0.75) ≈ 39, round up to 45 for safety
                                // CRITICAL: Reduced iterations for performance (Lag Fix)
                                // 45 was too high for 30fps. 25 is a good balance.
                                const iterations = 30;

                                // CRITICAL FIX (Bug #7): Normalize threshold to frame size
                                // ENHANCEMENT 3.2: Make threshold scale-aware for multi-scale detection
                                // Scale-aware threshold
                                const threshold = 5.0 / currentScaleWidth; // Loosened from 4.0

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

                            // ENHANCEMENT 3.2: Use scale-aware dimensions
                            const centerX = currentScaleWidth / 2;
                            const centerY = currentScaleHeight / 2;

                            const maxLines = Math.min(lineCount, 60); // OPTIMIZED: Process more lines for accuracy
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
                                    // STABILITY FIX: Tighten parallelism to prevent "weird shapes"
                                    const radToDeg = (rad: number) => rad * (180 / Math.PI);

                                    // Helper to get angle of a line (m = slope)
                                    const getLineAngle = (l: { m: number, vertical: boolean }) => {
                                        if (l.vertical) return 90;
                                        return radToDeg(Math.atan(l.m));
                                    };

                                    const tAngle = getLineAngle(lTop);
                                    const bAngle = getLineAngle(lBottom);
                                    const lAngle = getLineAngle(lLeft);
                                    const rAngle = getLineAngle(lRight);

                                    const angleDiff = (a: number, b: number) => {
                                        let diff = Math.abs(a - b);
                                        // Handle wrap around (e.g. 89 vs -89 is 178 diff, but we care about line orientation)
                                        // For strictly horizontal/vertical lines in this context:
                                        // Horizontal ~ 0, Vertical ~ 90 (or -90). 
                                        // Just use simple abs diff for now as slope -> atan returns -90 to 90.
                                        return diff;
                                    };

                                    // Max deviation 8 degrees
                                    const parallelThreshold = 8;
                                    const isParallel = angleDiff(tAngle, bAngle) <= parallelThreshold &&
                                        angleDiff(lAngle, rAngle) <= parallelThreshold;

                                    // Check Corner Angles (should be ~90 deg difference between H and V lines)
                                    // Horizontal ~ 0, Vertical ~ 90/ -90. Diff should be ~90.
                                    const isRectangular = Math.abs(Math.abs(tAngle - lAngle) - 90) <= 20;

                                    if (isParallel && isRectangular) {
                                        const tl = computeIntersect(lTop, lLeft);
                                        const tr = computeIntersect(lTop, lRight);
                                        const br = computeIntersect(lBottom, lRight);
                                        const bl = computeIntersect(lBottom, lLeft);

                                        if (tl && tr && br && bl) {
                                            // 6. Enterprise Geometric Validation
                                            // Sort corners spatially
                                            const pts = [tl, tr, br, bl];
                                            pts.sort((a, b) => a.y - b.y);
                                            const topPts = pts.slice(0, 2).sort((a, b) => a.x - b.x); // TL, TR
                                            const botPts = pts.slice(2, 4).sort((a, b) => a.x - b.x); // BL, BR

                                            const sTL = topPts[0];
                                            const sTR = topPts[1];
                                            const sBL = botPts[0];
                                            const sBR = botPts[1];

                                            const wTop = Math.sqrt(distSq(sTL, sTR));
                                            const wBot = Math.sqrt(distSq(sBL, sBR));
                                            const hLeft = Math.sqrt(distSq(sTL, sBL));
                                            const hRight = Math.sqrt(distSq(sTR, sBR));

                                            const avgW = (wTop + wBot) / 2;
                                            const avgH = (hLeft + hRight) / 2;

                                            // Validation 1: Size
                                            const minWidth = 120 * currentScale;
                                            const minHeight = 50 * currentScale;

                                            if (avgW > minWidth && avgH > minHeight) {
                                                const aspectRatio = Math.max(avgW, avgH) / Math.min(avgW, avgH);

                                                // Validation 2: Aspect Ratio
                                                if (aspectRatio > 2.0 && aspectRatio < 7.0) {
                                                    // Success!

                                                    // FRAME COORDINATES (Landscape 640x480)
                                                    // x: 0 (Left) -> 640 (Right)
                                                    // y: 0 (Top) -> 480 (Bottom)

                                                    // SCREEN COORDINATES (Portrait)
                                                    // The Sensor is rotated 90 degrees relative to the Screen.
                                                    // If we detect a Horizontal Kit in the Frame (Width > Height),
                                                    // it corresponds to a Vertical Kit on the Screen.

                                                    // Coordinate Mapping (90 deg Counter-Clockwise):
                                                    // Screen X (0-1) = Frame Y (0-1)
                                                    // Screen Y (0-1) = 1 - Frame X (0-1)

                                                    // ENHANCEMENT 3.2: Scale-aware coordinate normalization
                                                    // Corners are in scaled space, map back to original space
                                                    const normalizeAndRotate = (p: { x: number, y: number }) => {
                                                        // Scale back to original coordinates
                                                        const originalX = (p.x / currentScale);
                                                        const originalY = (p.y / currentScale);

                                                        return {
                                                            x: originalY / TARGET_HEIGHT,       // Swap X with Y (Normalized)
                                                            y: 1 - (originalX / TARGET_WIDTH)   // Rotate 90deg (Swap Y with 1-X)
                                                        };
                                                    };



                                                    const detectedCorners = [
                                                        normalizeAndRotate(sTL),
                                                        normalizeAndRotate(sTR),
                                                        normalizeAndRotate(sBR),
                                                        normalizeAndRotate(sBL)
                                                    ];

                                                    // Store this scale's result for multi-scale comparison
                                                    allScaleResults.push({
                                                        corners: detectedCorners,
                                                        confidence: aspectRatio > 3.5 ? 0.95 : 0.85, // Higher confidence for ideal aspect ratio
                                                        scale: currentScale,
                                                        avgWidth: avgW,
                                                        avgHeight: avgH
                                                    });

                                                    bestCorners = detectedCorners;
                                                    // Pass source dimensions (Swapped because we rotated detection 90 deg)
                                                    // Frame Width (640) became Screen Height. Frame Height (480) became Screen Width.
                                                    // So source width effectively = TARGET_HEIGHT
                                                    // source height effectively = TARGET_WIDTH
                                                }

                                            }
                                        }
                                    }
                                }
                            } // End of if (ptsTop.length >= 4...)
                        } catch (e) {
                            runOnJsError(`[FP] Border detection failed: ${e}`);
                        }

                        // Increment frame counter for scale cycling
                        frameCounter.current = (frameCounter.current + 1) % 900; // Reset every 30 seconds @ 30fps
                    }
                }
            }
        } catch (err) {
            runOnJsError(`[FP] Fatal Error: ${err}`);
        } finally {
            try {
                runOnJsLog(`[FP] Finally: Border=${shouldProcessBorder} Corners=${bestCorners.length}, Quality=${shouldProcessQuality}`);

                if (shouldProcessBorder && bestCorners.length > 0) {
                    // FIX: Pass dimensions (swapped for portrait)
                    runOnJsBorderDetected({
                        corners: bestCorners,
                        sourceWidth: TARGET_HEIGHT, // 480 (became Width)
                        sourceHeight: TARGET_WIDTH  // 640 (became Height)
                    });
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