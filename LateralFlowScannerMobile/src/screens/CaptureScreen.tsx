import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, ActivityIndicator, Pressable, GestureResponderEvent, Vibration, StatusBar, Platform } from 'react-native';
import { Camera, useCodeScanner } from 'react-native-vision-camera';
import ImageEditor from '@react-native-community/image-editor';
import KeepAwake from 'react-native-keep-awake';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import MlkitOcr from 'react-native-mlkit-ocr';

// ... (imports)

import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { CaptureScreenProps, DetectionMetadata } from '../types';
import { useCamera } from '../hooks/useCamera';
import { useSensors } from '../hooks/useSensors';
import { useCustomFrameProcessor } from '../hooks/useFrameProcessor';
import { useBorderDetection } from '../hooks/useBorderDetection';
import { useImageAnalysis } from '../hooks/useImageAnalysis';
import { useCapture } from '../hooks/useCapture';
import { useConcentrationBatch } from '../hooks/useConcentrationBatch';
import { useCaptureStore } from '../store/captureStore';
import { Loading } from '../components/UI/Loading';
import { useAuthStore } from '../store/authStore';
import { BorderGuide } from '../components/Camera/BorderGuide';
import { FocusIndicator } from '../components/Camera/FocusIndicator';
import { SensorDisplay } from '../components/Sensors/SensorDisplay';
import { AlignmentIndicator } from '../components/Sensors/AlignmentIndicator';
import { WarningBanner, FeedbackMessage } from '../components/Guides/WarningBanner';
import { GuideOverlay } from '../components/Guides/GuideOverlay';
import { BatchSelector } from '../components/ConcentrationBatch/BatchSelector';
import { AdvancedHistogramDisplay } from '../components/Camera/AdvancedHistogramDisplay';
import { ExposureMeter } from '../components/Camera/ExposureMeter';
import { ExposureSlider } from '../components/Camera/ExposureSlider';
import { AUTO_CAPTURE_CONDITIONS } from '../constants';
import { CAMERA_WIDTH, CAMERA_HEIGHT, GUIDE_X, GUIDE_Y, CASSETTE_WIDTH, CASSETTE_HEIGHT } from '../constants/layout';
import { cameraService } from '../services/camera.service';
import { imageProcessingService } from '../services/imageProcessing.service';
import { logger } from '../utils/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// CAMERA_HEIGHT is imported from constants/layout

// Adjusted heights
const HEADER_HEIGHT = 180;
const FOOTER_HEIGHT = 70;

export const CaptureScreen: React.FC = () => {
    const navigation = useNavigation<CaptureScreenProps['navigation']>();
    const route = useRoute<CaptureScreenProps['route']>();
    const isFocused = useIsFocused(); // Pause camera when not focused

    const { user } = useAuthStore();
    const settings = (user as any)?.settings || {
        autoCapture: true,
        showSensorData: false,
        hapticFeedback: true,
        highQualityMode: true
    };

    const {
        cameraRef,
        config,
        metadata,
        device,
        format,
        initializeCamera,
        capturePhoto,
        lockExposure,
        lockWhiteBalance,
        toggleTorch,
        setFocusMode,
        hasPermission,
        cameraKey
    } = useCamera(settings.highQualityMode);

    const { sensorData, isShaking, lightLevel, getAlignment, alignment, lightAnalysis, proximity, proximityWarning, orientation } = useSensors();
    const { borderData, guideColor, updateBorderDetection } = useBorderDetection();
    const { analysis, analyzeImage } = useImageAnalysis();
    const { processCapture, isProcessing } = useCapture();
    const { selectedBatch, selectBatch } = useConcentrationBatch();

    const {
        stableFrameCount,
        incrementStableFrameCount,
        resetStableFrameCount,
        setIsCapturing,
        setCurrentCapture
    } = useCaptureStore();

    const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([]);
    const [showSensorDisplay, setShowSensorDisplay] = useState(settings.showSensorData);
    const [showBatchSelector, setShowBatchSelector] = useState(false);
    const [autoCapturePending, setAutoCapturePending] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
    const [showGuide, setShowGuide] = useState(false);
    const [showExposure, setShowExposure] = useState(false);
    const [showHistogram, setShowHistogram] = useState(false);
    const [histogramMode, setHistogramMode] = useState<'rgb' | 'composite'>('rgb');
    const [manualExposure, setManualExposure] = useState(0);

    const [countdown, setCountdown] = useState<number | null>(null);
    const frameAnalysisRef = useRef<any>(null);
    const autoCaptureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // State for displaying analysis data (throttled to avoid UI lag)
    const [displayAnalysis, setDisplayAnalysis] = useState<any>(null);
    const lastUpdateRef = useRef(0);

    // Refs for stable access in callbacks
    const borderDataRef = useRef(borderData);
    borderDataRef.current = borderData;
    const isShakingRef = useRef(isShaking);
    isShakingRef.current = isShaking;
    const lightLevelRef = useRef(lightLevel);
    lightLevelRef.current = lightLevel;

    // === QR CODE SCANNER ===
    const lastScannedCode = useRef<{ value: string; timestamp: number } | null>(null);
    const codeScanner = useCodeScanner({
        codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'data-matrix'],
        onCodeScanned: (codes) => {
            if (codes.length > 0 && codes[0].value) {
                lastScannedCode.current = {
                    value: codes[0].value,
                    timestamp: Date.now()
                };
                // Optional: Feedback (only once per second to avoid spam)
                // console.log(`[QR] Scanned: ${codes[0].value}`);
            }
        }
    });

    const updateWarnings = (frameAnalysis: any) => {
        const messages: FeedbackMessage[] = [];

        // ========== ALERT / WARNING SYSTEM ==========
        // Use Refs to get latest state inside the stable callback
        const currentBorder = borderDataRef.current;
        const currentShaking = isShakingRef.current;
        const currentLight = lightLevelRef.current;

        if (!currentBorder?.detected) {
            messages.push({ type: 'error', message: '⚠️ Kit not detected', icon: 'test-tube-off' });
        } else if (!currentBorder?.isAligned) {
            messages.push({ type: 'warning', message: '↔️ Align kit with guide', icon: 'arrow-left-right' });
        } else if (!currentBorder?.isCentered) {
            messages.push({ type: 'warning', message: '⊕ Center kit in frame', icon: 'crosshairs' });
        } else {
            messages.push({ type: 'success', message: '✓ Kit detected', icon: 'test-tube' });
        }

        if (frameAnalysis?.blurAnalysis?.isBlurry) {
            const score = frameAnalysis?.blurAnalysis?.laplacianVariance?.toFixed(0) || '?';
            messages.push({ type: 'warning', message: `📷 Blurry (${score})`, icon: 'blur' });
        }

        if (frameAnalysis?.exposureAnalysis?.isUnderexposed) {
            messages.push({ type: 'warning', message: '🌙 Too dark', icon: 'brightness-5' });
        } else if (frameAnalysis?.exposureAnalysis?.isOverexposed) {
            messages.push({ type: 'warning', message: '☀️ Too bright', icon: 'white-balance-sunny' });
        }

        if (frameAnalysis?.shadowAnalysis?.hasShadow) {
            const coverage = ((frameAnalysis.shadowAnalysis as any)?.shadowCoverage * 100)?.toFixed(0) || '?';
            messages.push({ type: 'warning', message: `🌑 Shadow (${coverage}%)`, icon: 'weather-partly-cloudy' });
        }

        if (frameAnalysis?.reflectionAnalysis?.hasReflection) {
            const area = ((frameAnalysis.reflectionAnalysis as any)?.affectedArea * 100)?.toFixed(0) || '?';
            messages.push({ type: 'warning', message: `✨ Glare (${area}%)`, icon: 'flare' });
        }

        // White Balance Analysis
        if (frameAnalysis?.whiteBalanceAnalysis && !frameAnalysis.whiteBalanceAnalysis.isBalanced) {
            const dom = frameAnalysis.whiteBalanceAnalysis.dominantChannel;
            const tint = dom === 'red' ? 'Red' : (dom === 'blue' ? 'Blue' : 'Green');
            messages.push({ type: 'warning', message: `🎨 ${tint} tint detected`, icon: 'palette' });
        }

        if (currentShaking) {
            messages.push({ type: 'error', message: '📳 Hold steady!', icon: 'vibrate' });
        }

        if (currentLight < AUTO_CAPTURE_CONDITIONS.MIN_LIGHT_LEVEL) {
            messages.push({ type: 'warning', message: '💡 Low ambient light', icon: 'lightbulb-outline' });
        }

        if (frameAnalysis?.focusAnalysis?.needsFocus) {
            messages.push({ type: 'warning', message: '🔍 Tap to focus', icon: 'focus-field' });
        }

        const hasErrors = messages.some(m => m.type === 'error');
        const hasWarnings = messages.some(m => m.type === 'warning');

        // Only show "Ready" if completely clear
        if (!hasErrors && !hasWarnings && currentBorder?.detected) {
            messages.unshift({ type: 'success', message: '✓ Ready to capture!', icon: 'camera' });
        }

        setFeedbackMessages(messages);
    };

    // Frame processor for real-time analysis

    const frameProcessor = useCustomFrameProcessor(
        useCallback((corners) => {
            updateBorderDetection(corners);
        }, [updateBorderDetection]),
        useCallback((frameAnalysis) => {
            frameAnalysisRef.current = frameAnalysis;
            updateWarnings(frameAnalysis);

            // Throttle UI updates to ~10fps (100ms) unless it's the first update
            const now = Date.now();
            if (now - lastUpdateRef.current > 100 || !displayAnalysis) {
                setDisplayAnalysis(frameAnalysis);
                // Force immediate re-render if it was null
                lastUpdateRef.current = now;
            }
        }, [])
    );

    // Initialize camera on mount
    useEffect(() => {
        const init = async () => {
            try {
                StatusBar.setBarStyle('dark-content');
                if (Platform.OS === 'android') StatusBar.setBackgroundColor('#ffffff');
                await initializeCamera();
                setCameraError(null);
            } catch (error: any) {
                console.error('Camera initialization error:', error);
                setCameraError(error?.message || 'Failed to initialize camera');
            }
        };
        init();

        return () => {
            if (autoCaptureTimeoutRef.current) {
                clearTimeout(autoCaptureTimeoutRef.current);
            }
        };
    }, [initializeCamera]);

    // === SMART FOCUS ON DETECTION ===
    // Automatically focus on the center of the kit when it is detected
    const lastFocusTimeRef = useRef(0);
    useEffect(() => {
        if (!borderData?.detected || !cameraRef.current) return;

        // Debounce focus calls (e.g., limit to once every 2 seconds to avoid hunting)
        const now = Date.now();
        if (now - lastFocusTimeRef.current < 2000) return;

        // Calculate Center of the detected kit
        // borderData.corners is typically [TL, TR, BR, BL]
        if (borderData.corners && borderData.corners.length === 4) {
            const xs = borderData.corners.map(p => p.x);
            const ys = borderData.corners.map(p => p.y);

            // Average X and Y to find center
            const cx = xs.reduce((a, b) => a + b, 0) / 4;
            const cy = ys.reduce((a, b) => a + b, 0) / 4;

            console.log(`[SmartFocus] Focusing on detected kit at (${cx.toFixed(0)}, ${cy.toFixed(0)})`);

            cameraRef.current.focus({ x: cx, y: cy });
            lastFocusTimeRef.current = now;

            // Show feedback
            setFocusPoint({ x: cx, y: cy, visible: true });
            setTimeout(() => setFocusPoint(p => ({ ...p, visible: false })), 1000);
        }

    }, [borderData?.detected, borderData?.corners]); // Re-run when detection status or position updates slightly


    // Auto-capture logic
    useEffect(() => {
        if (!autoCapturePending || !settings.autoCapture) {
            setCountdown(null);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return;
        }

        const conditionsMet = checkAutoCaptureConditions();

        if (conditionsMet) {
            incrementStableFrameCount();
        } else {
            resetStableFrameCount();
            setCountdown(null);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        }

        if (stableFrameCount >= AUTO_CAPTURE_CONDITIONS.REQUIRED_STABLE_FRAMES && !countdown) {
            // Start Countdown
            setCountdown(3);
            countdownIntervalRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev === 1) {
                        clearInterval(countdownIntervalRef.current!);
                        handleAutoCapture();
                        return null;
                    }
                    return (prev || 0) - 1;
                });
            }, 1000);
        }
    }, [borderData, isShaking, lightLevel, autoCapturePending, stableFrameCount]);

    const checkAutoCaptureConditions = (): boolean => {
        const analysis = frameAnalysisRef.current;
        if (!borderData || !analysis) return false;

        const conditions = {
            borderDetected: borderData.detected && borderData.confidence >= AUTO_CAPTURE_CONDITIONS.MIN_BORDER_CONFIDENCE,
            borderAligned: borderData.isAligned && borderData.isCentered,
            notBlurry: !analysis.blurAnalysis?.isBlurry,
            exposureGood: !analysis.exposureAnalysis?.isUnderexposed && !analysis.exposureAnalysis?.isOverexposed,
            notShaking: !isShaking,
            lightGood: lightLevel >= AUTO_CAPTURE_CONDITIONS.MIN_LIGHT_LEVEL,
            noShadow: !analysis.shadowAnalysis?.hasShadow,
            noReflection: !analysis.reflectionAnalysis?.hasReflection,
        };
        return Object.values(conditions).every(Boolean);
    };



    const handleAutoCapture = async () => {
        setAutoCapturePending(false);
        resetStableFrameCount();
        await handleCapture('auto');
    };

    const handleManualCapture = async () => {
        await handleCapture('manual');
    };

    const handleExposureChange = useCallback(async (value: number) => {
        setManualExposure(value);
        try {
            await lockExposure(value);
        } catch (e) {
            console.warn('Failed to lock exposure:', e);
        }
    }, [lockExposure]);

    // ... inside CaptureScreen component ...

    const cropImageToKit = async (imageUri: string, detected: boolean, corners: any[], width: number, height: number, needsScaling: boolean = true): Promise<string> => {
        try {
            console.log(`[Crop] Input: Photo=${width}x${height}, Detected=${detected}, Corners=${JSON.stringify(corners)}`);

            // Frame Processor dimensions
            const FP_WIDTH = 480;
            const FP_HEIGHT = 640;

            let cropData = {
                offset: { x: 0, y: 0 },
                size: { width: 0, height: 0 }
            };

            // FIX: If corners are from Native High-Res (already in photo coordinates), scale is 1.0.
            // If corners are from Live Preview (480x640), we need to scale up (width/FP_WIDTH).
            const scaleX = needsScaling ? (width / FP_WIDTH) : 1.0;
            const scaleY = needsScaling ? (height / FP_HEIGHT) : 1.0;

            console.log(`[Crop] Scales: X=${scaleX.toFixed(3)}, Y=${scaleY.toFixed(3)}`);

            if (detected && corners && corners.length === 4) {
                const xs = corners.map((p: any) => p.x);
                const ys = corners.map((p: any) => p.y);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);

                // Add padding (e.g. 10%)
                // If scaled, padding is in photo pixels.
                const padX = (maxX - minX) * 0.1;
                const padY = (maxY - minY) * 0.1;

                cropData = {
                    offset: {
                        x: Math.max(0, (minX - padX) * scaleX),
                        y: Math.max(0, (minY - padY) * scaleY)
                    },
                    size: {
                        width: Math.min(width, (maxX - minX + 2 * padX) * scaleX),
                        height: Math.min(height, (maxY - minY + 2 * padY) * scaleY)
                    }
                };
            } else {
                // Static Guide Fallback (Always needs scaling from Screen Space)
                const screenScaleX = width / CAMERA_WIDTH;
                const screenScaleY = height / CAMERA_HEIGHT;

                cropData = {
                    offset: { x: GUIDE_X * screenScaleX, y: GUIDE_Y * screenScaleY },
                    size: { width: CASSETTE_WIDTH * screenScaleX, height: CASSETTE_HEIGHT * screenScaleY }
                };
            }

            // Ensure constraints (Round to integer for ImageEditor)
            cropData.offset.x = Math.floor(Math.max(0, cropData.offset.x));
            cropData.offset.y = Math.floor(Math.max(0, cropData.offset.y));
            if (cropData.offset.x + cropData.size.width > width) cropData.size.width = width - cropData.offset.x;
            if (cropData.offset.y + cropData.size.height > height) cropData.size.height = height - cropData.offset.y;

            cropData.size.width = Math.floor(cropData.size.width);
            cropData.size.height = Math.floor(cropData.size.height);

            console.log(`[Crop] Final Rect: ${JSON.stringify(cropData)}`);

            const result = await ImageEditor.cropImage(imageUri, {
                offset: cropData.offset,
                size: cropData.size,
                displaySize: { width: cropData.size.width, height: cropData.size.height },
                resizeMode: 'cover',
            });

            return (result as any).path || (result as any).uri || result;

        } catch (e) {
            console.warn('Crop failed, using original:', e);
            return imageUri;
        }
    };

    const handleCapture = async (mode: 'auto' | 'manual') => {
        try {
            setIsCapturing(true);
            if (!device) throw new Error('No camera device available');
            if (!config.isActive) throw new Error('Camera is not active');

            try {
                await lockExposure(manualExposure !== 0 ? manualExposure : config.exposure);
                await lockWhiteBalance();
            } catch (lockError) {
                logger.warn('Could not lock exposure/white balance', lockError);
            }

            Toast.show({ type: 'info', text1: 'Capturing...', visibilityTime: 1500 });
            const photo = await capturePhoto();

            if (!photo || !photo.path) throw new Error('Photo capture returned empty result');

            // === 1. HIGH PRECISION DETECTION (NATIVE C++) ===
            // We run the robust RANSAC/Hough detector on the FULL RESOLUTION image
            // to get the most accurate corners possible, overriding the Live Preview approximate corners.
            Toast.show({ type: 'info', text1: 'Refining detection...', visibilityTime: 1000 });

            let highResCorners = borderData.detected ? borderData.corners : null;
            let finalDetectionConfidence = borderData.confidence;
            let needsScaling = true; // Default: Preview sources need scaling to Photo coordinates

            try {
                const nativeDetection = await imageProcessingService.detectBordersFromImage(photo.path);
                if (nativeDetection.detected && nativeDetection.corners.length === 4) {
                    console.log('[Capture] High precision corners found:', nativeDetection.corners);
                    highResCorners = nativeDetection.corners;
                    finalDetectionConfidence = nativeDetection.confidence;
                    needsScaling = false; // Native detection is already in photo coordinates
                } else {
                    console.log('[Capture] High precision detection failed, falling back to live preview');
                }
            } catch (e) {
                console.warn('[Capture] Native detection error', e);
            }

            // === 1.5 OCR & QR Integration ===
            // 2024: Passive QR/OCR scanning implementation
            // If we found a QR code recently (e.g. within last 2 seconds), attach it.
            const now = Date.now();
            let finalQrCode = undefined;
            if (lastScannedCode.current && (now - lastScannedCode.current.timestamp < 3000)) {
                // If code is fresh (seen in last 3 seconds), use it
                finalQrCode = lastScannedCode.current.value;
                console.log('[Capture] Using recently scanned QR:', finalQrCode);
            }

            // Perform OCR on the captured image (Full Resolution)
            // Ideally we run this in parallel with other analysis but before final save
            let cassetteId = undefined;
            let lotNumber = undefined;

            try {
                // OCR returns Array of blocks
                Toast.show({ type: 'info', text1: 'Reading Text...', visibilityTime: 500 });
                console.log('[Capture] Starting OCR on:', photo.path);
                const ocrResult = await MlkitOcr.detectFromFile(photo.path);

                if (ocrResult && ocrResult.length > 0) {
                    console.log('[Capture] OCR Found blocks:', ocrResult.length);
                    const fullText = ocrResult.map(block => block.text).join('\n');

                    // Simple Heuristics for ID / Lot (Customize regex as needed)
                    // Example: "ID: 12345" or "LOT: ABC"
                    // For now, checks for generic patterns. 
                    // TODO: Move these regexes to a config or schema file

                    // Look for "Lot" followed by alphanumeric
                    const lotMatch = fullText.match(/(?:Lot|LOT|L\/N)\s*[:.]?\s*([A-Z0-9-]+)/i);
                    if (lotMatch) lotNumber = lotMatch[1];

                    // Look for "ID" or generic alphanumeric string if isolated (simplified)
                    const idMatch = fullText.match(/(?:ID|REF)\s*[:.]?\s*([A-Z0-9-]+)/i);
                    if (idMatch) cassetteId = idMatch[1];

                    // Fallback: If we detect 2 distinct alphanumeric codes that are essentially isolated lines
                    // we might guess. But usually safer to only extract if labeled.
                }
            } catch (ocrErr) {
                console.warn('[Capture] OCR Failed:', ocrErr);
                // Do NOT block capture flow
            }

            // === 2. CROP IMAGE TO KIT (Using Best Available Corners) ===
            Toast.show({ type: 'info', text1: 'Processing & Cropping...', visibilityTime: 1500 });

            let finalImageUri = photo.path;
            try {
                finalImageUri = await cropImageToKit(
                    photo.path,
                    !!highResCorners,
                    highResCorners || [],
                    photo.width,
                    photo.height,
                    needsScaling
                );
            } catch (cropErr) {
                logger.warn('Crop failed', cropErr);
                Toast.show({ type: 'error', text1: 'Crop failed', text2: 'Using full image' });
            }

            Toast.show({ type: 'info', text1: 'Analyzing image...', visibilityTime: 1500 });

            let realAnalysis: any = null;
            try {
                realAnalysis = await analyzeImage(finalImageUri);
            } catch (analysisError) {
                logger.warn('Image analysis failed, using defaults', analysisError);
            }

            // Parse EXIF to populate CameraMetadata
            let nativeExif: any = {};
            try {
                nativeExif = await imageProcessingService.extractExif(finalImageUri);
            } catch (e) {
                logger.warn('EXIF extraction failed', e);
            }

            // Map EXIF to normalized CameraMetadata
            // Note: EXIF tags usually return strings, we parse them.
            // ExposureTime "0.02" -> 0.02
            // FNumber "1.8" -> 1.8
            // ISO "100" -> 100

            const updatedMetadata = {
                ...metadata,
                width: photo.width,
                height: photo.height,
                timestamp: new Date().toISOString(),
                // Populate dynamic values from Native EXIF
                iso: nativeExif.iso ? parseInt(nativeExif.iso, 10) : (metadata?.iso || 0),
                aperture: nativeExif.aperture ? parseFloat(nativeExif.aperture) : (metadata?.aperture || 0),
                exposureTime: nativeExif.exposureTime ? parseFloat(nativeExif.exposureTime) : (metadata?.exposureTime || 0),
                focalLength: nativeExif.focalLength ? parseFloat(nativeExif.focalLength) : (metadata?.focalLength || 0),
                make: nativeExif.make || metadata?.make || 'Unknown',
                model: nativeExif.model || metadata?.model || 'Unknown',
                flash: nativeExif.flash ? (parseInt(nativeExif.flash) > 0) : (metadata?.flash || false),
                whiteBalance: nativeExif.whiteBalance ? parseInt(nativeExif.whiteBalance) : (metadata?.whiteBalance || 0),
            };

            const analysisData = {
                qualityScore: realAnalysis?.qualityScore ?? 50,
                warnings: realAnalysis?.warnings ?? [],
                recommendations: realAnalysis?.recommendations ?? [],
                histogram: realAnalysis?.histogram ?? null,
                hsvData: realAnalysis?.hsvData ?? null,
                exposureAnalysis: realAnalysis?.exposureAnalysis ?? null,
                blurAnalysis: realAnalysis?.blurAnalysis ?? null,
                borderDetection: realAnalysis?.borderDetection ?? null,
                shadowAnalysis: realAnalysis?.shadowAnalysis ?? null,
                reflectionAnalysis: realAnalysis?.reflectionAnalysis ?? null,
                // Use captured image analysis as fallback for frameAnalysis to avoid null
                frameAnalysis: frameAnalysisRef.current || {
                    blurAnalysis: realAnalysis?.blurAnalysis,
                    exposureAnalysis: realAnalysis?.exposureAnalysis,
                    shadowAnalysis: realAnalysis?.shadowAnalysis,
                    whiteBalanceAnalysis: null, // Not available in static analysis yet
                    focusAnalysis: null
                },
                ...(realAnalysis || {}),
                borderCorners: borderData?.detected ? borderData.corners : null,
            };

            const fullSensorData = {
                ...(sensorData || {}),
                ambientLight: {
                    lux: lightLevel,
                    analysis: lightAnalysis
                },
                proximity: {
                    distance: proximity,
                    warning: proximityWarning
                },
                alignment: alignment,
                deviceMotion: {
                    ...(sensorData?.deviceMotion || {}),
                    isShaking,
                    orientation: orientation
                }
            };

            // CONSTRUCT PROOF OF ALGORITHMS
            // If needsScaling is false, it means we used the NATIVE C++ RESULT directly.
            const usedNative = !needsScaling;
            const detectionMetadata: DetectionMetadata = {
                engine: usedNative ? 'NATIVE_CPP_JSI' : 'JS_FALLBACK',
                algorithms: usedNative ? [
                    'PROBABILISTIC_HOUGH_TRANSFORM',
                    'ROBUST_WELSCH_FITTING', // The RANSAC equivalent
                    'CANNY_EDGE_DETECTION_STRUCTURE',
                    'OPENCV_NATIVE'
                ] : [
                    'JS_PREVIEW_APPROXIMATION',
                    'KALMAN_FILTER_2D', // Kalman is always active on preview
                    'THROTTLED_JS_WORKLET'
                ],
                parameters: {
                    confidence: finalDetectionConfidence,
                    fittingMethod: usedNative ? 'DIST_WELSCH' : 'SIMPLE_APPROX',
                    scalingApplied: needsScaling
                },
                version: '2.0.0-Hybrid'
            };

            const capturedData = await processCapture(
                finalImageUri,
                updatedMetadata,
                fullSensorData,
                analysisData,
                selectedBatch ? selectedBatch.name : '', // Concentration Value
                detectionMetadata, // PASS METADATA HERE
                selectedBatch ? selectedBatch.id : undefined, // Batch ID
                { cassetteId, lotNumber, qrCode: finalQrCode } // Newly Added OCR Data
            );

            if (capturedData) {
                if (settings.hapticFeedback) {
                    const options = {
                        enableVibrateFallback: true,
                        ignoreAndroidSystemSettings: false,
                    };
                    ReactNativeHapticFeedback.trigger('notificationSuccess', options);
                }
                capturedData.captureMode = mode;
                setCurrentCapture(capturedData);
                navigation.navigate('Review', { captureData: capturedData, imageUri: finalImageUri });
                Toast.show({
                    type: 'success',
                    text1: 'Capture Successful',
                    visibilityTime: 2000,
                });
            } else {
                throw new Error('Processing capture returned no data');
            }
        } catch (error: any) {
            logger.error('Capture error', error);
            Toast.show({ type: 'error', text1: 'Capture failed', text2: error?.message || String(error) });
        } finally {
            setIsCapturing(false);
        }
    };

    const handleBatchSelect = (batch: any) => {
        selectBatch(batch);
        setShowBatchSelector(false);
        Toast.show({ type: 'success', text1: 'Concentration selected', text2: batch.name });
    };

    const handleTapToFocus = useCallback(async (event: GestureResponderEvent) => {
        try {
            if (!cameraRef.current) return;
            const { locationX, locationY } = event.nativeEvent;

            // Show focus indicator IMMEDIATELY before async focus operation
            setFocusPoint({ x: locationX, y: locationY, visible: true });

            await cameraRef.current.focus({ x: locationX, y: locationY });

            // Hide after delay
            setTimeout(() => setFocusPoint(p => ({ ...p, visible: false })), 1500);

        } catch (e) {
            console.warn('[Focus] Could not focus:', e);
        }
    }, [cameraRef]);

    if (cameraError) {
        return (
            <View style={[styles.container, styles.errorContainer]}>
                <Icon name="camera-off" size={64} color="#ef4444" />
                <Text style={styles.errorTitle}>Camera Error</Text>
                <Text style={styles.errorText}>{cameraError}</Text>
                <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.errorButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!device || !hasPermission) {
        return (
            <View style={[styles.container, styles.errorContainer]}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Initializing camera...</Text>
            </View>
        );
    }

    // Combine previous analysisRef data with current sensor data for display
    const currentAnalysisData = {
        frameAnalysis: frameAnalysisRef.current,
        borderCorners: borderData?.detected ? borderData.corners : null
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeepAwake />

            {/* ===== HEADER (Updated Layout) ===== */}
            <View style={styles.header}>
                {/* 1. Main Header: Back & Title */}
                <View style={styles.headerMainRow}>
                    <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Capture</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* 2. Controls Panel (Moved Down) */}
                <View style={styles.controlsPanel}>
                    <TouchableOpacity style={[styles.controlButton, config.torch === 'on' && styles.controlButtonActive]} onPress={toggleTorch}>
                        <Icon name={config.torch === 'on' ? 'flashlight' : 'flashlight-off'} size={20} color={config.torch === 'on' ? '#f59e0b' : '#4b5563'} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.controlButton, showExposure && styles.controlButtonActive]} onPress={() => setShowExposure(!showExposure)}>
                        <Icon name="brightness-6" size={20} color={showExposure ? '#3b82f6' : '#4b5563'} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlButton, showHistogram && styles.controlButtonActive]}
                        onPress={() => {
                            if (!showHistogram) {
                                setShowHistogram(true);
                                setHistogramMode('rgb');
                            } else if (histogramMode === 'rgb') {
                                setHistogramMode('composite');
                            } else {
                                setShowHistogram(false);
                            }
                        }}
                    >
                        <Icon name="chart-bar" size={20} color={showHistogram ? '#8b5cf6' : '#4b5563'} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.controlButton, showSensorDisplay && styles.controlButtonActive]} onPress={() => setShowSensorDisplay(!showSensorDisplay)}>
                        <Icon name="information-variant" size={20} color={showSensorDisplay ? '#10b981' : '#4b5563'} />
                    </TouchableOpacity>
                </View>

                {/* 3. Concentration Button */}
                <TouchableOpacity style={styles.concentrationButton} onPress={() => setShowBatchSelector(true)}>
                    <Icon name="test-tube" size={18} color="#3b82f6" />
                    <Text style={styles.concentrationText} numberOfLines={1}>{selectedBatch ? selectedBatch.name : 'Select Concentration'}</Text>
                    <Icon name="chevron-down" size={18} color="#6b7280" />
                </TouchableOpacity>
            </View>

            {/* ===== CAMERA PREVIEW (Centered, 3:4) ===== */}
            <View style={styles.cameraContainer}>
                <View style={styles.cameraWrapper}>
                    <Camera
                        ref={cameraRef}
                        key={`camera-${cameraKey}`} // FORCE REMOUNT on permission grant
                        style={StyleSheet.absoluteFill}
                        device={device}
                        isActive={config.isActive && isFocused}
                        photo={true}
                        format={format}
                        pixelFormat="yuv"
                        fps={config.fps}
                        zoom={config.zoom}
                        exposure={config.exposure}
                        torch={config.torch}
                        photoQualityBalance={config.photoQualityBalance}
                        frameProcessor={frameProcessor}
                        codeScanner={codeScanner}
                    />

                    {/* Touch Area for Focus (Background Layer) */}
                    {/* Rendered early so UI elements sit ON TOP of it */}
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleTapToFocus} />

                    {/* Border & Guides */}
                    <BorderGuide corners={borderData.corners} color={guideColor} isDetected={borderData.detected} />
                    <FocusIndicator x={focusPoint.x} y={focusPoint.y} visible={focusPoint.visible} />

                    {/* Overlays */}
                    {countdown !== null && (
                        <View style={styles.countdownContainer}>
                            <Text style={styles.countdownText}>{countdown}</Text>
                            <Text style={styles.capturingText}>Stabilize...</Text>
                        </View>
                    )}

                    <WarningBanner messages={feedbackMessages} />

                    {/* --- DEBUG & INFO OVERLAYS --- */}
                    {showSensorDisplay && (
                        <SensorDisplay
                            sensorData={sensorData}
                            lightLevel={lightLevel}
                            isShaking={isShaking}
                            alignment={getAlignment()}
                            proximity={proximity}
                            analysisData={{
                                frameAnalysis: displayAnalysis,
                                borderDetection: borderData
                            }}
                        />
                    )}

                    {(showHistogram || showSensorDisplay) && (
                        <View style={styles.histogramOverlay}>
                            <AdvancedHistogramDisplay
                                data={displayAnalysis?.histogram}
                                mode="luminance"
                                visible={true}
                            />
                            <TouchableOpacity onPress={() => setHistogramMode(prev => prev === 'rgb' ? 'composite' : 'rgb')}>
                                <AdvancedHistogramDisplay
                                    data={displayAnalysis?.histogram}
                                    mode={histogramMode}
                                    visible={true}
                                />
                                <View style={styles.histogramSwitchBadge}>
                                    <Icon name="swap-horizontal" size={12} color="#fff" />
                                    <Text style={styles.histogramSwitchText}>{histogramMode.toUpperCase()}</Text>
                                </View>
                            </TouchableOpacity>

                            <ExposureMeter
                                analysis={displayAnalysis?.exposureAnalysis}
                                visible={true}
                            />
                        </View>
                    )}

                    {showExposure && (
                        <View style={styles.exposureOverlay}>
                            <ExposureSlider value={manualExposure} onChange={handleExposureChange} min={-2} max={2} />
                        </View>
                    )}


                </View>
            </View>

            {/* ===== FOOTER (Compact) ===== */}
            <View style={styles.footer}>
                <View style={styles.footerSide}>
                    {alignment && <AlignmentIndicator alignment={alignment} compact />}
                </View>

                <TouchableOpacity
                    style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
                    onPress={handleManualCapture}
                    disabled={isProcessing}
                >
                    <View style={styles.captureButtonInner} />
                </TouchableOpacity>

                <View style={styles.footerSide}>
                    <TouchableOpacity style={styles.footerButton} onPress={() => setShowGuide(true)}>
                        <Icon name="help-circle-outline" size={26} color="#4b5563" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ===== MODALS ===== */}
            {showBatchSelector && (
                <BatchSelector visible={showBatchSelector} onClose={() => setShowBatchSelector(false)} onSelect={handleBatchSelect} />
            )}

            <GuideOverlay visible={showGuide} onClose={() => setShowGuide(false)} />

            {autoCapturePending && (
                <View style={styles.autoCaptureIndicator}>
                    <ActivityIndicator size="small" color="#10b981" />
                    <Text style={styles.autoCaptureText}>Auto-capture: {AUTO_CAPTURE_CONDITIONS.REQUIRED_STABLE_FRAMES - stableFrameCount}</Text>
                </View>
            )}

            <Loading visible={isProcessing} overlay={true} text="Processing..." />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    errorContainer: {
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorTitle: { color: '#fff', fontSize: 18, marginTop: 16 },
    errorText: { color: '#9ca3af', marginTop: 8 },
    errorButton: { marginTop: 20, backgroundColor: '#3b82f6', padding: 12, borderRadius: 8 },
    errorButtonText: { color: '#fff' },
    loadingText: { color: '#fff', marginTop: 12 },

    // HEADER LAYOUT
    header: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 10 : 0, // Adjust for status bar
        paddingBottom: 0,
        zIndex: 10,
        justifyContent: 'flex-end',
        // Ensure header fills space above camera
    },
    headerMainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8, // Space between title and controls
    },
    headerButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        alignSelf: 'center',
        flex: 1,
        textAlign: 'center',
    },
    // backButton: { // This was in the diff but not used in JSX, keeping original headerButton
    //     width: 40, height: 40,
    //     justifyContent: 'center', alignItems: 'center',
    //     backgroundColor: '#f1f5f9', borderRadius: 20
    // },
    controlsPanel: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 8,
        marginTop: 4,
        paddingVertical: 8,
    },
    controlButton: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center',
        borderWidth: 0,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
        elevation: 3,
    },
    controlButtonActive: {
        backgroundColor: '#eff6ff',
    },
    concentrationButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
        borderWidth: 1, borderColor: '#dbeafe'
    },
    concentrationText: {
        flex: 1, marginHorizontal: 8, fontSize: 14, fontWeight: '600', color: '#1e40af'
    },
    // pickerContainer: { // This was in the diff but not used in JSX
    //     marginBottom: 10, // Margin closest to camera
    // },

    // CAMERA LAYOUT
    cameraContainer: {
        width: SCREEN_WIDTH, // Original was SCREEN_WIDTH, diff had CAMERA_WIDTH. Keeping original for consistency.
        height: CAMERA_HEIGHT,
        overflow: 'hidden',
        backgroundColor: '#000',
        alignSelf: 'center', // Center horizontally
    },
    cameraWrapper: {
        width: SCREEN_WIDTH,
        height: CAMERA_HEIGHT,
        overflow: 'hidden',
    },

    // FOOTER LAYOUT
    footer: {
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingBottom: 20,
        paddingTop: 20, // Add padding to connect with camera
        flex: 1, // Fill remaining space below camera
    },
    footerSide: { width: 60, alignItems: 'center' },
    footerButton: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center'
    },
    captureButton: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: '#10b981',
        marginTop: -20, // Reduced overlap (was -36)
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6
    },
    captureButtonDisabled: { opacity: 0.5 },
    captureButtonInner: {
        width: 54, height: 54, borderRadius: 27, backgroundColor: '#10b981'
    },
    exposureOverlay: {
        position: 'absolute',
        right: 20,
        top: '25%',
        height: '50%',
        justifyContent: 'center'
    },
    histogramOverlay: {
        position: 'absolute',
        top: 70, // Moved down to avoid warning banner overlap
        right: 10,
        alignItems: 'flex-end',
        gap: 8,
    },
    histogramSwitchBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        flexDirection: 'row',
        alignItems: 'center', // Fix alignment
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        gap: 4
    },
    histogramSwitchText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold'
    },

    // INDICATORS
    autoCaptureIndicator: {
        position: 'absolute', top: 20, alignSelf: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.9)', padding: 10, borderRadius: 20,
        flexDirection: 'row', alignItems: 'center',
    },
    autoCaptureText: { color: '#fff', marginLeft: 8, fontWeight: '600', fontSize: 12 },
    countdownContainer: {
        position: 'absolute', top: '50%', left: '50%',
        transform: [{ translateX: -50 }, { translateY: -50 }], alignItems: 'center'
    },
    countdownText: { fontSize: 80, fontWeight: 'bold', color: '#fff', textShadowRadius: 10 },
    capturingText: { fontSize: 18, color: '#fff', fontWeight: '600', marginTop: 8 },
});