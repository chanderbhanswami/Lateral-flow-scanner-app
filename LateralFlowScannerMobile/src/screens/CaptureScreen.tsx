import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, ActivityIndicator, Pressable, GestureResponderEvent, Vibration, StatusBar, Platform } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import ImageEditor from '@react-native-community/image-editor';

// ... (imports)

import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { CaptureScreenProps } from '../types';
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
import { logger } from '../utils/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// CAMERA_HEIGHT is imported from constants/layout

// Adjusted heights
const HEADER_HEIGHT = 180;
const FOOTER_HEIGHT = 70;

export const CaptureScreen: React.FC = () => {
    const navigation = useNavigation<CaptureScreenProps['navigation']>();
    const route = useRoute<CaptureScreenProps['route']>();

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

    const cropImageToKit = async (imageUri: string, detected: boolean, corners: any[], width: number, height: number): Promise<string> => {
        try {
            // ... (previous logic for cropData calc) ...

            // Re-paste logic for brevity here or assume it's kept? 
            // Better to replace the whole function to be safe with tool usage.

            // Default to static guide if not detected
            let cropData = {
                offset: { x: 0, y: 0 },
                size: { width: 0, height: 0 }
            };

            const scaleX = width / CAMERA_WIDTH;
            const scaleY = height / CAMERA_HEIGHT;

            if (detected && corners && corners.length === 4) {
                const xs = corners.map(p => p.x);
                const ys = corners.map(p => p.y);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);

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
                cropData = {
                    offset: { x: GUIDE_X * scaleX, y: GUIDE_Y * scaleY },
                    size: { width: CASSETTE_WIDTH * scaleX, height: CASSETTE_HEIGHT * scaleY }
                };
            }

            // Ensure constraints
            if (cropData.offset.x < 0) cropData.offset.x = 0;
            if (cropData.offset.y < 0) cropData.offset.y = 0;
            if (cropData.offset.x + cropData.size.width > width) cropData.size.width = width - cropData.offset.x;
            if (cropData.offset.y + cropData.size.height > height) cropData.size.height = height - cropData.offset.y;

            const result = await ImageEditor.cropImage(imageUri, {
                offset: cropData.offset,
                size: cropData.size,
                displaySize: { width: cropData.size.width, height: cropData.size.height },
                resizeMode: 'cover',
            });

            // Modern ImageEditor returns object with path/uri or just path depending on version. 
            // @react-native-community/image-editor returns { path: string, ... } or uri.
            // Actually it returns Promise<CropResult> where CropResult = { path: string, width: number, height: number, ... }
            // Let's coerce.
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

            Toast.show({ type: 'info', text1: 'Processing & Cropping...', visibilityTime: 1500 });

            // CROP IMAGE TO KIT
            let finalImageUri = photo.path;
            try {
                finalImageUri = await cropImageToKit(
                    photo.path,
                    borderData.detected,
                    borderData.corners,
                    photo.width,
                    photo.height
                );
            } catch (cropErr) {
                logger.warn('Crop failed', cropErr);
            }

            Toast.show({ type: 'info', text1: 'Analyzing image...', visibilityTime: 1500 });

            let realAnalysis: any = null;
            try {
                realAnalysis = await analyzeImage(finalImageUri);
            } catch (analysisError) {
                logger.warn('Image analysis failed, using defaults', analysisError);
            }

            const captureMetadata = { ...metadata, width: photo.width || 0, height: photo.height || 0 };

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
                frameAnalysis: frameAnalysisRef.current || null,
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

            const capturedData = await processCapture(finalImageUri, captureMetadata, fullSensorData, analysisData);

            if (capturedData) {
                if (settings.hapticFeedback) {
                    Vibration.vibrate(50);
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

    if (!device) {
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

                    <TouchableOpacity style={[styles.controlButton, showHistogram && styles.controlButtonActive]} onPress={() => setShowHistogram(!showHistogram)}>
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
                        style={StyleSheet.absoluteFill}
                        device={device}
                        isActive={config.isActive}
                        photo={true}
                        format={format}
                        pixelFormat="yuv"
                        fps={config.fps}
                        zoom={config.zoom}
                        exposure={config.exposure}
                        torch={config.torch}
                        photoQualityBalance={config.photoQualityBalance}
                        frameProcessor={frameProcessor}
                    />

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
                            <AdvancedHistogramDisplay
                                data={displayAnalysis?.histogram}
                                mode="rgb"
                                visible={true}
                            />
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

                    {/* Touch Area for Focus (Full Screen Overlay) */}
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleTapToFocus} />
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
        backgroundColor: '#000',
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
        top: 20,
        right: 10,
        alignItems: 'flex-end',
        gap: 8,
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