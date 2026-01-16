import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ConcentrationBatch } from '../../types';

interface CameraControlsProps {
    onCapture: () => void;
    onToggleTorch: () => void;
    onToggleSensorDisplay: () => void;
    onShowBatchSelector: () => void;
    selectedBatch: ConcentrationBatch | null;
    isCapturing: boolean;
    torchEnabled: boolean;
}

import { ExposureSlider } from './ExposureSlider';

// ...

interface CameraControlsProps {
    onCapture: () => void;
    onToggleTorch: () => void;
    onToggleSensorDisplay: () => void;
    onShowBatchSelector: () => void;
    selectedBatch: ConcentrationBatch | null;
    isCapturing: boolean;
    torchEnabled: boolean;
    exposure: number;
    onExposureChange: (value: number) => void;
    supportsExposure: boolean;
    isSensorDisplayVisible: boolean;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
    onCapture,
    onToggleTorch,
    onToggleSensorDisplay,
    onShowBatchSelector,
    selectedBatch,
    isCapturing,
    torchEnabled,
    exposure,
    onExposureChange,
    supportsExposure,
    isSensorDisplayVisible,
}) => {
    const [showExposure, setShowExposure] = React.useState(false);

    return (
        <View style={styles.container}>
            {/* Top Controls */}
            <View style={styles.topControls}>
                <TouchableOpacity style={styles.iconButton} onPress={onToggleTorch}>
                    <Icon
                        name={torchEnabled ? 'flashlight' : 'flashlight-off'}
                        size={28}
                        color={torchEnabled ? '#fbbf24' : '#fff'}
                    />
                </TouchableOpacity>

                {/* Exposure Toggle */}
                {supportsExposure && (
                    <TouchableOpacity
                        style={[styles.iconButton, showExposure && styles.iconButtonActive]}
                        onPress={() => setShowExposure(!showExposure)}
                    >
                        <Icon name="brightness-6" size={28} color="#fff" />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.iconButton, isSensorDisplayVisible ? styles.iconButtonActive : null]}
                    onPress={onToggleSensorDisplay}
                >
                    <Icon
                        name={isSensorDisplayVisible ? "information" : "information-off"}
                        size={28}
                        color={isSensorDisplayVisible ? "#fff" : "#9ca3af"}
                    />
                </TouchableOpacity>
            </View>

            {/* Exposure Slider Overlay */}
            {showExposure && (
                <View style={styles.exposureContainer}>
                    <ExposureSlider
                        value={exposure}
                        onChange={onExposureChange}
                        min={-2}
                        max={2}
                    />
                </View>
            )}

            {/* Batch Selection */}
            {/* ... remaining render code ... */}
            <TouchableOpacity style={styles.batchButton} onPress={onShowBatchSelector}>
                <Icon name="test-tube" size={20} color="#fff" />
                <Text style={styles.batchText}>
                    {selectedBatch ? selectedBatch.name : 'Select Concentration'}
                </Text>
            </TouchableOpacity>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
                <TouchableOpacity
                    style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
                    onPress={onCapture}
                    disabled={isCapturing}
                >
                    <View style={styles.captureButtonInner} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 60,
    },
    iconButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    batchButton: {
        position: 'absolute',
        top: 120,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    batchText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    bottomControls: {
        alignItems: 'center',
        paddingBottom: 40,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#10b981',
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
    iconButtonActive: {
        backgroundColor: 'rgba(16, 185, 129, 0.5)', // Green tint
    },
    exposureContainer: {
        position: 'absolute',
        top: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 40,
        zIndex: 10,
    },
});