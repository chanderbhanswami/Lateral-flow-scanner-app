import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface CameraOverlayProps {
    children?: React.ReactNode;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({ children }) => {
    return (
        <View style={styles.container} pointerEvents="box-none">
            {/* Top overlay */}
            <View style={styles.topOverlay} />

            {/* Left overlay */}
            <View style={styles.leftOverlay} />

            {/* Center clear area */}
            <View style={styles.centerClear} pointerEvents="box-none">
                {children}
            </View>

            {/* Right overlay */}
            <View style={styles.rightOverlay} />

            {/* Bottom overlay */}
            <View style={styles.bottomOverlay} />
        </View>
    );
};

const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.6)';
const CLEAR_AREA = {
    width: width * 0.8,
    height: height * 0.4,
    top: height * 0.3,
    left: width * 0.1,
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
    },
    topOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: CLEAR_AREA.top,
        backgroundColor: OVERLAY_COLOR,
    },
    leftOverlay: {
        position: 'absolute',
        top: CLEAR_AREA.top,
        left: 0,
        width: CLEAR_AREA.left,
        height: CLEAR_AREA.height,
        backgroundColor: OVERLAY_COLOR,
    },
    centerClear: {
        position: 'absolute',
        top: CLEAR_AREA.top,
        left: CLEAR_AREA.left,
        width: CLEAR_AREA.width,
        height: CLEAR_AREA.height,
    },
    rightOverlay: {
        position: 'absolute',
        top: CLEAR_AREA.top,
        right: 0,
        width: CLEAR_AREA.left,
        height: CLEAR_AREA.height,
        backgroundColor: OVERLAY_COLOR,
    },
    bottomOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height - CLEAR_AREA.top - CLEAR_AREA.height,
        backgroundColor: OVERLAY_COLOR,
    },
});