import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice, useCameraFormat, CameraProps } from 'react-native-vision-camera';
import { useIsFocused } from '@react-navigation/native';

interface CameraViewProps extends Partial<CameraProps> {
    isActive: boolean;
    onInitialized?: () => void;
    onError?: (error: Error) => void;
    children?: React.ReactNode;
}

import { useAppState } from '../../hooks/useAppState';

// ...

export const CameraView: React.FC<CameraViewProps> = ({
    isActive,
    onInitialized,
    onError,
    children,
    ...cameraProps
}) => {
    const camera = useRef<Camera>(null);
    const device = useCameraDevice('back');
    const isFocused = useIsFocused();
    const { isActive: isAppActive } = useAppState(); // Use the hook
    const [isReady, setIsReady] = useState(false);

    const format = useCameraFormat(device, [
        { photoResolution: 'max' },
        { fps: 30 },
    ]);

    useEffect(() => {
        if (device && isFocused) {
            setIsReady(true);
            onInitialized?.();
        }
    }, [device, isFocused, onInitialized]);

    const handleError = (error: Error) => {
        console.error('Camera error:', error);
        onError?.(error);
    };

    if (!device) {
        return (
            <View style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Camera not available</Text>
                    <Text style={styles.errorSubtext}>Please check camera permissions</Text>
                </View>
            </View>
        );
    }

    if (!isReady) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Initializing camera...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Camera
                ref={camera}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isActive && isFocused && isAppActive}
                photo={true}
                video={false}
                format={format}
                onError={handleError}
                {...cameraProps}
            />
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        padding: 20,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorSubtext: {
        color: '#9ca3af',
        fontSize: 14,
        textAlign: 'center',
    },
});