import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, ActivityIndicator, Pressable, GestureResponderEvent } from 'react-native';
import { Camera } from 'react-native-vision-camera';
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
import { Vibration } from 'react-native';
import { BorderGuide } from '../components/Camera/BorderGuide';
import { FocusIndicator } from '../components/Camera/FocusIndicator';
import { SensorDisplay } from '../components/Sensors/SensorDisplay';
import { AlignmentIndicator } from '../components/Sensors/AlignmentIndicator';
import { WarningBanner, FeedbackMessage } from '../components/Guides/WarningBanner';
import { GuideOverlay } from '../components/Guides/GuideOverlay';
import { BatchSelector } from '../components/ConcentrationBatch/BatchSelector';
import { HistogramDisplay } from '../components/Camera/HistogramDisplay';
import { ExposureMeter } from '../components/Camera/ExposureMeter';
import { ExposureSlider } from '../components/Camera/ExposureSlider';
import { AUTO_CAPTURE_CONDITIONS } from '../constants';
import { CAMERA_HEIGHT } from '../constants/layout';
import { logger } from '../utils/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Header and footer heights
const HEADER_HEIGHT = 150;
const FOOTER_HEIGHT = 80;

export const CaptureScreen: React.FC = () => {
    const navigation = useNavigation<CaptureScreenProps['navigation']>();
    const route = useRoute<CaptureScreenProps['route']>();

    const { user } = useAuthStore();
    const settings = (user as any)?.settings || {
        autoCapture: true,  // Default values if no settings found
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
    const [manualExposure, setManualExposure] = useState(0);

    const [countdown, setCountdown] = useState<number | null>(null);
    const frameAnalysisRef = useRef<any>(null);
    const autoCaptureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Frame processor for real-time analysis
    const frameProcessor = useCustomFrameProcessor(
        useCallback((corners) => {
            updateBorderDetection(corners);
        }, [updateBorderDetection]),
        useCallback((frameAnalysis) => {
            frameAnalysisRef.current = frameAnalysis;
            updateWarnings(frameAnalysis);
        }, [])
    );

    // Initialize camera on mount
    useEffect(() => {
        const init = async () => {
            try {
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
    }, [borderData, isShaking, lightLevel, autoCapturePending, stableFrameCount]); // Removed analysis dependency

    const checkAutoCaptureConditions = (): boolean => {
        const analysis = frameAnalysisRef.current;
        if (!borderData || !analysis) return false;

        const conditions = {
            borderDetected: borderData.detected && borderData.confidence >= AUTO_CAPTURE_CONDITIONS.MIN_BORDER_CONFIDENCE,
            borderAligned: borderData.isAligned && borderData.isCentered, // Strict alignment
            notBlurry: !analysis.blurAnalysis?.isBlurry, // Use frame analysis
            exposureGood: !analysis.exposureAnalysis?.isUnderexposed && !analysis.exposureAnalysis?.isOverexposed,
            notShaking: !isShaking,
            lightGood: lightLevel >= AUTO_CAPTURE_CONDITIONS.MIN_LIGHT_LEVEL,
            noShadow: !analysis.shadowAnalysis?.hasShadow,
            noReflection: !analysis.reflectionAnalysis?.hasReflection,
        };
        return Object.values(conditions).every(Boolean);
    };

    const updateWarnings = (frameAnalysis: any) => {
        const messages: FeedbackMessage[] = [];

        // ========== KIT/BORDER DETECTION ==========
        if (!borderData?.detected) {
            messages.push({ type: 'error', message: '⚠️ Kit not detected', icon: 'test-tube-off' });
        } else if (!borderData?.isAligned) {
            messages.push({ type: 'warning', message: '↔️ Align kit with guide', icon: 'arrow-left-right' });
        } else if (!borderData?.isCentered) {
            messages.push({ type: 'warning', message: '⊕ Center kit in frame', icon: 'crosshairs' });
        } else {
            messages.push({ type: 'success', message: '✓ Kit detected', icon: 'test-tube' });
        }

        // ========== BLUR DETECTION (from frame processor) ==========
        if (frameAnalysis?.blurAnalysis?.isBlurry) {
            const score = frameAnalysis?.blurAnalysis?.laplacianVariance?.toFixed(0) || '?';
            messages.push({ type: 'warning', message: `📷 Blurry (${score})`, icon: 'blur' });
        } else if (frameAnalysis?.blurAnalysis && !frameAnalysis.blurAnalysis.isBlurry) {
            messages.push({ type: 'success', message: '✓ Sharp', icon: 'camera-iris' });
        }

        // ========== EXPOSURE DETECTION ==========
        if (frameAnalysis?.exposureAnalysis?.isUnderexposed) {
            messages.push({ type: 'warning', message: '🌙 Too dark', icon: 'brightness-5' });
        } else if (frameAnalysis?.exposureAnalysis?.isOverexposed) {
            messages.push({ type: 'warning', message: '☀️ Too bright', icon: 'white-balance-sunny' });
        } else if (frameAnalysis?.exposureAnalysis) {
            messages.push({ type: 'success', message: '✓ Good exposure', icon: 'brightness-6' });
        }

        // ========== SHADOW DETECTION ==========
        if (frameAnalysis?.shadowAnalysis?.hasShadow) {
            const coverage = ((frameAnalysis.shadowAnalysis.shadowCoverage || 0) * 100).toFixed(0);
            messages.push({ type: 'warning', message: `🌑 Shadow (${coverage}%)`, icon: 'weather-partly-cloudy' });
        }

        // ========== REFLECTION/GLARE DETECTION ==========
        if (frameAnalysis?.reflectionAnalysis?.hasReflection) {
            const intensity = ((frameAnalysis.reflectionAnalysis.reflectionIntensity || 0) * 100).toFixed(0);
            messages.push({ type: 'warning', message: `✨ Glare (${intensity}%)`, icon: 'flare' });
        }

        // ========== WHITE BALANCE ==========
        if (frameAnalysis?.whiteBalanceAnalysis && !frameAnalysis.whiteBalanceAnalysis.isBalanced) {
            const channel = frameAnalysis.whiteBalanceAnalysis.dominantChannel;
            messages.push({ type: 'info', message: `🎨 ${channel} tint`, icon: 'palette' });
        }

        // ========== DEVICE STABILITY (from sensors) ==========
        if (isShaking) {
            messages.push({ type: 'error', message: '📳 Hold steady!', icon: 'vibrate' });
        }

        // ========== AMBIENT LIGHT (from sensor) ==========
        if (lightLevel < AUTO_CAPTURE_CONDITIONS.MIN_LIGHT_LEVEL) {
            messages.push({ type: 'warning', message: '💡 Low ambient light', icon: 'lightbulb-outline' });
        } else if (lightLevel > 1000) {
            messages.push({ type: 'info', message: '☀️ Bright environment', icon: 'weather-sunny' });
        }

        // ========== FOCUS ANALYSIS ==========
        if (frameAnalysis?.focusAnalysis?.needsFocus) {
            messages.push({ type: 'warning', message: '🔍 Tap to focus', icon: 'focus-field' });
        }

        // ========== OVERALL READINESS ==========
        const hasErrors = messages.some(m => m.type === 'error');
        const hasWarnings = messages.some(m => m.type === 'warning');

        if (!hasErrors && !hasWarnings && borderData?.detected) {
            // All conditions are good - ready to capture!
            messages.unshift({ type: 'success', message: '✓ Ready to capture!', icon: 'camera' });
        }

        setFeedbackMessages(messages);
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

            Toast.show({ type: 'info', text1: 'Analyzing image...', visibilityTime: 1500 });

            // Call analyzeImage to get REAL analysis data (qualityScore, blur, exposure, etc.)
            let realAnalysis: any = null;
            try {
                realAnalysis = await analyzeImage(photo.path);
            } catch (analysisError) {
                logger.warn('Image analysis failed, using defaults', analysisError);
            }

            const captureMetadata = { ...metadata, width: photo.width || 0, height: photo.height || 0 };

            // Build analysisData with real analysis or defaults
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
                frameAnalysis: frameAnalysisRef.current || null, // Save live frame processing data (focus, etc.)
                ...(realAnalysis || {}),
                borderCorners: borderData?.detected ? borderData.corners : null,
            };

            // Merge all sensor data into one payload
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

            const capturedData = await processCapture(photo.path, captureMetadata, fullSensorData, analysisData);

            if (capturedData) {
                if (settings.hapticFeedback) {
                    Vibration.vibrate(50);
                }
                capturedData.captureMode = mode;
                setCurrentCapture(capturedData);
                navigation.navigate('Review', { captureData: capturedData, imageUri: photo.path });
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
            await cameraRef.current.focus({ x: locationX, y: locationY });
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

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* ===== HEADER ===== */}
            <View style={styles.header}>
                {/* Top Row: Back + Title + Controls */}
                <View style={styles.headerTopRow}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
                            <Icon name="arrow-left" size={24} color="#1f2937" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Capture</Text>
                    </View>

                    <View style={styles.headerControls}>
                        <TouchableOpacity style={styles.controlButton} onPress={toggleTorch}>
                            <Icon name={config.torch === 'on' ? 'flashlight' : 'flashlight-off'} size={22} color={config.torch === 'on' ? '#f59e0b' : '#6b7280'} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.controlButton, showExposure && styles.controlButtonActive]} onPress={() => setShowExposure(!showExposure)}>
                            <Icon name="brightness-6" size={22} color="#6b7280" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.controlButton, showSensorDisplay && styles.controlButtonActive]} onPress={() => setShowSensorDisplay(!showSensorDisplay)}>
                            <Icon name="information-outline" size={22} color="#6b7280" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Concentration Selector */}
                <TouchableOpacity style={styles.concentrationButton} onPress={() => setShowBatchSelector(true)}>
                    <Icon name="test-tube" size={18} color="#3b82f6" />
                    <Text style={styles.concentrationText}>{selectedBatch ? selectedBatch.name : 'Select Concentration'}</Text>
                    <Icon name="chevron-down" size={18} color="#6b7280" />
                </TouchableOpacity>
            </View>

            {/* ===== CAMERA PREVIEW (3:4) ===== */}
            <View style={styles.cameraContainer}>
                <Pressable style={styles.cameraWrapper} onPress={handleTapToFocus}>
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
                        lowLightBoost={config.lowLightBoost}
                        photoQualityBalance={config.photoQualityBalance}
                        frameProcessor={frameProcessor}
                        onInitialized={() => console.log('Camera initialized!')}
                        onError={(e) => {
                            console.error('Camera Runtime Error:', e);
                            setCameraError(`Camera Error: ${e.message} (${e.code})`);
                        }}
                    />

                    {/* Border Guide */}
                    <BorderGuide corners={borderData.corners} color={guideColor} isDetected={borderData.detected} />

                    {/* Focus Indicator */}
                    <FocusIndicator x={focusPoint.x} y={focusPoint.y} visible={focusPoint.visible} />

                    {/* Countdown Overlay */}
                    {countdown !== null && (
                        <View style={styles.countdownContainer}>
                            <Text style={styles.countdownText}>{countdown}</Text>
                            <Text style={styles.capturingText}>Stabilize...</Text>
                        </View>
                    )}

                    {/* Feedback Banner */}
                    <WarningBanner messages={feedbackMessages} />

                    {/* Sensor Display Overlay (if enabled) */}
                    {showSensorDisplay && (
                        <View style={styles.sensorOverlay}>
                            <SensorDisplay sensorData={sensorData} lightLevel={lightLevel} isShaking={isShaking} alignment={getAlignment()} />
                            <View style={styles.histogramContainer}>
                                <HistogramDisplay data={analysis?.histogram || null} visible={true} />
                                <ExposureMeter analysis={analysis?.exposureAnalysis || null} visible={true} />
                            </View>
                        </View>
                    )}

                    {/* Exposure Slider (if enabled) */}
                    {showExposure && (
                        <View style={styles.exposureOverlay}>
                            <ExposureSlider value={manualExposure} onChange={handleExposureChange} min={-2} max={2} />
                        </View>
                    )}
                </Pressable>
            </View>

            {/* ===== FOOTER ===== */}
            <View style={styles.footer}>
                {/* Left: Alignment Indicator */}
                <View style={styles.footerSide}>
                    {alignment && <AlignmentIndicator alignment={alignment} compact />}
                </View>

                {/* Center: Capture Button */}
                <TouchableOpacity
                    style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
                    onPress={handleManualCapture}
                    disabled={isProcessing}
                >
                    <View style={styles.captureButtonInner} />
                </TouchableOpacity>

                {/* Right: Help Button */}
                <View style={styles.footerSide}>
                    <TouchableOpacity style={styles.footerButton} onPress={() => setShowGuide(true)}>
                        <Icon name="help-circle-outline" size={28} color="#6b7280" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ===== MODALS & OVERLAYS ===== */}
            {showBatchSelector && (
                <BatchSelector visible={showBatchSelector} onClose={() => setShowBatchSelector(false)} onSelect={handleBatchSelect} />
            )}

            <GuideOverlay visible={showGuide} onClose={() => setShowGuide(false)} />

            {autoCapturePending && (
                <View style={styles.autoCaptureIndicator}>
                    <ActivityIndicator size="small" color="#10b981" />
                    <Text style={styles.autoCaptureText}>Auto-capturing in {AUTO_CAPTURE_CONDITIONS.REQUIRED_STABLE_FRAMES - stableFrameCount}...</Text>
                </View>
            )}

            <Loading visible={isProcessing} overlay={true} text="Processing..." />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#000',
    },
    errorTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    errorText: {
        color: '#9ca3af',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    errorButton: {
        marginTop: 24,
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    errorButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    loadingText: {
        color: '#fff',
        marginTop: 16,
    },

    // Header
    header: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    headerControls: {
        flexDirection: 'row',
        gap: 8,
    },
    controlButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlButtonActive: {
        backgroundColor: '#dbeafe',
    },
    concentrationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    concentrationText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },

    // Camera (3:4 aspect ratio)
    cameraContainer: {
        height: CAMERA_HEIGHT,
        backgroundColor: '#000',
    },
    cameraWrapper: {
        flex: 1,
        overflow: 'hidden',
    },
    sensorOverlay: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
    },
    histogramContainer: {
        position: 'absolute',
        top: 10,
        right: 0,
        alignItems: 'flex-end',
        gap: 8,
    },
    exposureOverlay: {
        position: 'absolute',
        top: '40%',
        left: 20,
        right: 20,
    },

    // Footer
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        paddingVertical: 20,
        paddingHorizontal: 30,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    footerSide: {
        width: 60,
        alignItems: 'center',
    },
    footerButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#10b981',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    captureButtonDisabled: {
        opacity: 0.5,
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#10b981',
    },

    // Auto-capture indicator
    autoCaptureIndicator: {
        position: 'absolute',
        top: 150,
        alignSelf: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.9)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
    },
    autoCaptureText: {
        color: '#fff',
        marginLeft: 10,
        fontWeight: '600',
    },
    countdownContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -50 }, { translateY: -50 }],
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
    },
    countdownText: {
        fontSize: 80,
        fontWeight: 'bold',
        color: '#ffffff',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    capturingText: {
        fontSize: 18,
        color: '#ffffff',
        fontWeight: '600',
        marginTop: 8,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});