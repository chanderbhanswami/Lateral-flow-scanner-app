import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Ellipse } from 'react-native-svg';
import {
    CAMERA_WIDTH,
    CAMERA_HEIGHT,
    CASSETTE_WIDTH,
    CASSETTE_HEIGHT,
    GUIDE_X,
    GUIDE_Y,
    WINDOW_WIDTH,
    WINDOW_HEIGHT,
    WINDOW_X_OFFSET,
    WINDOW_Y_OFFSET,
    SAMPLE_WELL_WIDTH,
    SAMPLE_WELL_HEIGHT,
    SAMPLE_WELL_X_OFFSET,
    SAMPLE_WELL_Y_OFFSET
} from '../../constants/layout';

interface BorderGuideProps {
    corners: Array<{ x: number; y: number }>;
    color: string;
    isDetected: boolean;
}

export const BorderGuide: React.FC<BorderGuideProps> = ({ corners, color, isDetected }) => {
    // Use green when detected, otherwise use provided color
    const guideColor = isDetected ? '#10b981' : color || '#ef4444';

    return (
        <View style={styles.container} pointerEvents="none">
            <Svg width={CAMERA_WIDTH} height={CAMERA_HEIGHT}>
                {/* Main Cassette Outline - Solid rounded rectangle */}
                <Rect
                    x={GUIDE_X}
                    y={GUIDE_Y}
                    width={CASSETTE_WIDTH}
                    height={CASSETTE_HEIGHT}
                    rx={6}
                    ry={6}
                    stroke={guideColor}
                    strokeWidth={2}
                    fill="none"
                />

                {/* Result Window - Solid rectangle centered horizontally */}
                <Rect
                    x={GUIDE_X + WINDOW_X_OFFSET}
                    y={GUIDE_Y + WINDOW_Y_OFFSET}
                    width={WINDOW_WIDTH}
                    height={WINDOW_HEIGHT}
                    rx={3}
                    ry={3}
                    stroke={guideColor}
                    strokeWidth={1.5}
                    fill="none"
                />

                {/* Sample Well - Oval/Ellipse at bottom */}
                <Ellipse
                    cx={GUIDE_X + SAMPLE_WELL_X_OFFSET + SAMPLE_WELL_WIDTH / 2}
                    cy={GUIDE_Y + SAMPLE_WELL_Y_OFFSET + SAMPLE_WELL_HEIGHT / 2}
                    rx={SAMPLE_WELL_WIDTH / 2}
                    ry={SAMPLE_WELL_HEIGHT / 2}
                    stroke={guideColor}
                    strokeWidth={1.5}
                    fill="none"
                />
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
});