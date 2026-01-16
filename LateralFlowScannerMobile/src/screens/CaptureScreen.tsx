import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, ActivityIndicator, Pressable, GestureResponderEvent } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
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
import { usePermissions } from '../hooks/usePermissions';
import { useThrottle } from '../hooks/useThrottle';
import { useCaptureStore } from '../store/captureStore';
import { CameraOverlay } from '../components/Camera/CameraOverlay';
import { Loading } from '../components/UI/Loading';
import { BorderGuide } from '../components/Camera/BorderGuide';
import { CameraControls } from '../components/Camera/CameraControls';
import { FocusIndicator } from '../components/Camera/FocusIndicator';
import { SensorDisplay } from '../components/Sensors/SensorDisplay';
import { AlignmentIndicator } from '../components/Sensors/AlignmentIndicator';
import { WarningBanner } from '../components/Guides/WarningBanner';
import { GuideOverlay } from '../components/Guides/GuideOverlay';
import { BatchSelector } from '../components/ConcentrationBatch/BatchSelector';
import { HistogramDisplay } from '../components/Camera/HistogramDisplay';
import { ExposureMeter } from '../components/Camera/ExposureMeter';
import { AUTO_CAPTURE_CONDITIONS } from '../constants';
import { logger } from '../utils/logger';

const { width, height } = Dimensions.get('window');

export const CaptureScreen: React.FC = () => {
    const navigation = useNavigation<CaptureScreenProps['navigation']>();
    const route = useRoute<CaptureScreenProps['route']>();

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
    } = useCamera();

    const { sensorData, isShaking, lightLevel, getAlignment, alignment } = useSensors();
    const { borderData, guideColor, updateBorderDetection } = useBorderDetection();
    const { analysis, analyzeImage } = useImageAnalysis();
    const { processCapture, isProcessing } = useCapture();
    const { selectedBatch, selectBatch } = useConcentrationBatch();

    const {
        stableFrameCount,
        incrementStableFrameCount,
        resetStableFrameCount,
        setIsCapturing
    } = useCaptureStore();

    const [warnings, setWarnings] = useState<string[]>([]);
    const [showSensorDisplay, setShowSensorDisplay] = useState(true);
    const [showBatchSelector, setShowBatchSelector] = useState(false);
    const [autoCapturePending, setAutoCapturePending] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // New state for additional components
    const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
    const [showGuide, setShowGuide] = useState(false);
    const [showAlignmentIndicator, setShowAlignmentIndicator] = useState(true);

    const autoCaptureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Frame processor for real-time analysis
    const frameProcessor = useCustomFrameProcessor(
        useCallback((corners) => {
            updateBorderDetection(corners);
        }, [updateBorderDetection]),
        useCallback((frameAnalysis) => {
            // Update warnings based on frame analysis
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
        if (autoCapturePending && checkAutoCaptureConditions()) {
            incrementStableFrameCount();

            if (stableFrameCount >= AUTO_CAPTURE_CONDITIONS.REQUIRED_STABLE_FRAMES) {
                handleAutoCapture();
            }
        } else {
            resetStableFrameCount();
        }
    }, [borderData, isShaking, lightLevel, analysis, autoCapturePending, stableFrameCount]);

    // Auto-capture timeout
    useEffect(() => {
        if (autoCapturePending) {
            autoCaptureTimeoutRef.current = setTimeout(() => {
                setAutoCapturePending(false);
                Toast.show({
                    type: 'info',
                    text1: 'Auto-capture timeout',
                    text2: 'Please capture manually',
                });
            }, AUTO_CAPTURE_CONDITIONS.STABILITY_TIMEOUT);
        }

        return () => {
            if (autoCaptureTimeoutRef.current) {
                clearTimeout(autoCaptureTimeoutRef.current);
            }
        };
    }, [autoCapturePending]);

    const checkAutoCaptureConditions = (): boolean => {
        if (!borderData || !analysis) return false;

        const conditions = {
            borderDetected: borderData.detected && borderData.confidence >= AUTO_CAPTURE_CONDITIONS.MIN_BORDER_CONFIDENCE,
            borderAligned: borderData.isAligned && borderData.isCentered,
            notBlurry: !analysis.blurAnalysis.isBlurry && analysis.blurAnalysis.blurScore >= AUTO_CAPTURE_CONDITIONS.MIN_BLUR_SCORE,
            exposureGood: !analysis.exposureAnalysis.isUnderexposed && !analysis.exposureAnalysis.isOverexposed,
            notShaking: !isShaking,
            lightGood: lightLevel >= AUTO_CAPTURE_CONDITIONS.MIN_LIGHT_LEVEL,
            noShadow: !analysis.shadowAnalysis.hasShadow,
            noReflection: !analysis.reflectionAnalysis.hasReflection,
        };

        return Object.values(conditions).every(Boolean);
    };

    const updateWarnings = (frameAnalysis: any) => {
        const newWarnings: string[] = [];

        // Border warnings - use optional chaining for safety
        if (!borderData?.detected) {
            newWarnings.push('Cassette not detected');
        } else if (!borderData?.isAligned) {
            newWarnings.push('Align cassette with guide frame');
        } else if (!borderData?.isCentered) {
            newWarnings.push('Center cassette in frame');
        }

        // Sensor warnings
        if (isShaking) {
            newWarnings.push('Device is shaking - hold steady');
        }

        // Light warnings
        if (lightLevel < AUTO_CAPTURE_CONDITIONS.MIN_LIGHT_LEVEL) {
            newWarnings.push('Low light - move to brighter area');
        }

        // Analysis warnings
        if (analysis) {
            if (analysis.blurAnalysis.isBlurry) {
                newWarnings.push('Image is blurry - tap to focus');
            }
            if (analysis.exposureAnalysis.isUnderexposed) {
                newWarnings.push('Underexposed - increase lighting');
            }
            if (analysis.exposureAnalysis.isOverexposed) {
                newWarnings.push('Overexposed - reduce lighting');
            }
            if (analysis.shadowAnalysis.hasShadow) {
                newWarnings.push('Shadow detected - adjust position');
            }
            if (analysis.reflectionAnalysis.hasReflection) {
                newWarnings.push('Reflection detected - adjust angle');
            }
        }

        setWarnings(newWarnings);
    };

    const handleAutoCapture = async () => {
        setAutoCapturePending(false);
        resetStableFrameCount();
        await handleCapture('auto');
    };

    const handleManualCapture = async () => {
        await handleCapture('manual');
    };

    const [manualExposure, setManualExposure] = useState(0);

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

            // Validate camera is ready before attempting capture
            if (!device) {
                throw new Error('No camera device available');
            }

            if (!config.isActive) {
                throw new Error('Camera is not active - please wait for initialization');
            }

            // Lock exposure (use manual value if set, otherwise auto/config)
            try {
                await lockExposure(manualExposure !== 0 ? manualExposure : config.exposure);
                await lockWhiteBalance();
            } catch (lockError) {
                logger.warn('Could not lock exposure/white balance', lockError);
                // Continue anyway - not critical
            }

            // Capture photo
            Toast.show({
                type: 'info',
                text1: 'Capturing...',
                visibilityTime: 1500,
            });

            const photo = await capturePhoto();

            if (!photo || !photo.path) {
                throw new Error('Photo capture returned empty result');
            }

            // Prepare metadata with fallbacks
            const captureMetadata = {
                ...metadata,
                width: photo.width || 0,
                height: photo.height || 0,
            };

            // Prepare analysis data with fallbacks
            const analysisData = {
                ...analysis,
                borderCorners: borderData?.detected ? borderData.corners : null,
            };

            // Process capture
            const capturedData = await processCapture(
                photo.path,
                captureMetadata,
                sensorData || {},
                analysisData
            );

            if (capturedData) {
                capturedData.captureMode = mode;
                capturedData.concentrationBatchId = selectedBatch?.id || '';

                // Navigate to review screen
                navigation.navigate('Review', {
                    captureData: capturedData,
                    imageUri: photo.path,
                });
            } else {
                throw new Error('Processing capture returned no data');
            }
        } catch (error: any) {
            logger.error('Capture error', error);
            Toast.show({
                type: 'error',
                text1: 'Capture failed',
                text2: error?.message || String(error),
            });
        } finally {
            setIsCapturing(false);
        }
    };

    const handleBatchSelect = (batch: any) => {
        selectBatch(batch);
        setShowBatchSelector(false);
        Toast.show({
            type: 'success',
            text1: 'Concentration selected',
            text2: batch.name,
        });
    };

    if (cameraError) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <Icon name="camera-off" size={64} color="#ef4444" />
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
                    Camera Error
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                    {cameraError}
                </Text>
                <TouchableOpacity
                    style={{ marginTop: 24, backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!device) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={{ color: '#fff', marginTop: 16 }}>Initializing camera...</Text>
            </View>
        );
    }

    // Tap-to-Focus Handler
    const handleTapToFocus = useCallback(async (event: GestureResponderEvent) => {
        try {
            if (!cameraRef.current) return;

            const { locationX, locationY } = event.nativeEvent;
            console.log(`[Focus] Tapping at (${locationX}, ${locationY})`);

            // Call the camera's focus method
            await cameraRef.current.focus({ x: locationX, y: locationY });
            console.log('[Focus] Focus set successfully');
        } catch (e) {
            console.warn('[Focus] Could not focus:', e);
        }
    }, [cameraRef]);

    return (
        <View style={styles.container}>
            {/* Tap-to-Focus Wrapper */}
            <Pressable
                style={StyleSheet.absoluteFill}
                onPress={handleTapToFocus}
            >
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
                    onInitialized={() => {
                        console.log('Camera initialized!');
                    }}
                    onError={(e) => {
                        console.error('Camera Runtime Error:', e);
                        setCameraError(`Camera Error: ${e.message} (${e.code})`);
                        Toast.show({
                            type: 'error',
                            text1: 'Camera Failed',
                            text2: e.message
                        });
                    }}
                />
            </Pressable>

            {/* Border Guide */}
            <BorderGuide
                corners={borderData.corners}
                color={guideColor}
                isDetected={borderData.detected}
            />

            {/* Warning Banner */}
            {warnings.length > 0 && (
                <WarningBanner warnings={warnings} />
            )}

            {/* Sensor Display */}
            {showSensorDisplay && (
                <>
                    <SensorDisplay
                        sensorData={sensorData}
                        lightLevel={lightLevel}
                        isShaking={isShaking}
                        alignment={getAlignment()}
                    />

                    <View style={styles.histogramContainer}>
                        <HistogramDisplay
                            data={analysis?.histogram || null}
                            visible={true}
                        />
                        <View style={styles.spacer} />
                        <ExposureMeter
                            analysis={analysis?.exposureAnalysis || null}
                            visible={true}
                        />
                    </View>
                </>
            )}

            {/* Camera Controls */}
            <CameraControls
                onCapture={handleManualCapture}
                onToggleTorch={toggleTorch}
                onToggleSensorDisplay={() => setShowSensorDisplay(!showSensorDisplay)}
                onShowBatchSelector={() => setShowBatchSelector(true)}
                selectedBatch={selectedBatch}
                isCapturing={isProcessing}
                torchEnabled={config.torch === 'on'}
                exposure={manualExposure}
                onExposureChange={handleExposureChange}
                supportsExposure={true} // Assuming device supports it or treating as "has slider"
                isSensorDisplayVisible={showSensorDisplay}
            />

            {/* Batch Selector Modal */}
            {showBatchSelector && (
                <BatchSelector
                    visible={showBatchSelector}
                    onClose={() => setShowBatchSelector(false)}
                    onSelect={handleBatchSelect}
                />
            )}

            {/* Focus Indicator - shows tap-to-focus feedback */}
            <FocusIndicator
                x={focusPoint.x}
                y={focusPoint.y}
                visible={focusPoint.visible}
            />

            {/* Alignment Indicator - visual level indicator */}
            {showAlignmentIndicator && alignment && (
                <View style={styles.alignmentContainer}>
                    <AlignmentIndicator alignment={alignment} />
                </View>
            )}

            {/* Guide Overlay - help modal */}
            <GuideOverlay
                visible={showGuide}
                onClose={() => setShowGuide(false)}
            />

            {/* Help Button */}
            <TouchableOpacity
                style={styles.helpButton}
                onPress={() => setShowGuide(true)}
            >
                <Icon name="help-circle-outline" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Auto-capture indicator */}
            {autoCapturePending && (
                <View style={styles.autoCaptureIndicator}>
                    <ActivityIndicator size="small" color="#10b981" />
                    <Text style={styles.autoCaptureText}>
                        Auto-capturing in {AUTO_CAPTURE_CONDITIONS.REQUIRED_STABLE_FRAMES - stableFrameCount}...
                    </Text>
                </View>
            )}

            {/* Processing overlay */}
            <Loading
                visible={isProcessing}
                overlay={true}
                text="Processing..."
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    autoCaptureIndicator: {
        position: 'absolute',
        top: 100,
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
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    processingText: {
        color: '#fff',
        fontSize: 18,
        marginTop: 10,
        fontWeight: '600',
    },
    histogramContainer: {
        position: 'absolute',
        top: 60,
        right: 20,
        alignItems: 'flex-end',
        zIndex: 5,
    },
    spacer: {
        height: 10,
    },
    alignmentContainer: {
        position: 'absolute',
        bottom: 200,
        left: 20,
        zIndex: 10,
    },
    helpButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
});