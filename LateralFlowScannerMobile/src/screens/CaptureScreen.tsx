import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
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
import { CameraOverlay } from '../components/Camera/CameraOverlay';
import { BorderGuide } from '../components/Camera/BorderGuide';
import { CameraControls } from '../components/Camera/CameraControls';
import { SensorDisplay } from '../components/Sensors/SensorDisplay';
import { WarningBanner } from '../components/Guides/WarningBanner';
import { BatchSelector } from '../components/ConcentrationBatch/BatchSelector';
import { HistogramDisplay } from '../components/Camera/HistogramDisplay';
import { ExposureMeter } from '../components/Camera/ExposureMeter';
import { AUTO_CAPTURE_CONDITIONS } from '../constants';

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

    const { sensorData, isShaking, lightLevel, getAlignment } = useSensors();
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
        initializeCamera();

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

        // Border warnings
        if (!borderData.detected) {
            newWarnings.push('Cassette not detected');
        } else if (!borderData.isAligned) {
            newWarnings.push('Align cassette with guide frame');
        } else if (!borderData.isCentered) {
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

            // Lock exposure (use manual value if set, otherwise auto/config)
            await lockExposure(manualExposure !== 0 ? manualExposure : config.exposure);
            await lockWhiteBalance();

            // Capture photo
            Toast.show({
                type: 'info',
                text1: 'Capturing...',
            });

            const photo = await capturePhoto();

            // Process capture
            const captureData = await processCapture(
                photo.path,
                metadata,
                sensorData,
                analysis
            );

            if (captureData) {
                captureData.captureMode = mode;
                captureData.concentrationBatchId = selectedBatch?.id || '';

                // Navigate to review screen
                navigation.navigate('Review', {
                    captureData,
                    imageUri: photo.path,
                });
            }
        } catch (error) {
            console.error('Capture error:', error);
            Toast.show({
                type: 'error',
                text1: 'Capture failed',
                text2: String(error),
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

    if (!device) {
        return (
            <View style={styles.container}>
                <Text>Camera not available</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={config.isActive}
                photo={true}
                format={format}
                fps={config.fps}
                zoom={config.zoom}
                exposure={config.exposure}
                torch={config.torch}
                lowLightBoost={config.lowLightBoost}
                photoQualityBalance={config.photoQualityBalance}
                frameProcessor={frameProcessor}
            />

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
            />

            {/* Batch Selector Modal */}
            {showBatchSelector && (
                <BatchSelector
                    visible={showBatchSelector}
                    onClose={() => setShowBatchSelector(false)}
                    onSelect={handleBatchSelect}
                />
            )}

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
            {isProcessing && (
                <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.processingText}>Processing...</Text>
                </View>
            )}
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
});