import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Ellipse, Polygon, Circle } from 'react-native-svg';
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

    // Scale factors (processing frame is 480x640, verifying against screen size)
    // Note: If frame processor uses 480x640 for portrait
    const scaleX = CAMERA_WIDTH / 480;
    const scaleY = CAMERA_HEIGHT / 640;

    const renderDynamicGuide = () => {
        if (!isDetected || !corners || corners.length !== 4) return null;

        // Convert corners to string for Polygon points
        // Scale the points to screen coordinates
        const points = corners
            .map(p => `${p.x * scaleX},${p.y * scaleY}`)
            .join(' ');

        return (
            <Svg width={CAMERA_WIDTH} height={CAMERA_HEIGHT} style={StyleSheet.absoluteFill}>
                <Polygon
                    points={points}
                    stroke={guideColor}
                    strokeWidth={3}
                    fill="rgba(16, 185, 129, 0.2)" // Light green transparent fill
                />

                {/* Draw corners with circles for better visibility */}
                {corners.map((p, i) => (
                    <Circle
                        key={i}
                        cx={p.x * scaleX}
                        cy={p.y * scaleY}
                        r={4}
                        fill={guideColor}
                    />
                ))}
            </Svg>
        );
    };

    return (
        <View style={styles.container} pointerEvents="none">
            {isDetected ? (
                renderDynamicGuide()
            ) : (
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
                        strokeDasharray="10 5" // Dashed line for static guide to indicate it's a target
                    />

                    {/* Result Window */}
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
                        strokeOpacity={0.5}
                    />

                    {/* Sample Well */}
                    <Ellipse
                        cx={GUIDE_X + SAMPLE_WELL_X_OFFSET + SAMPLE_WELL_WIDTH / 2}
                        cy={GUIDE_Y + SAMPLE_WELL_Y_OFFSET + SAMPLE_WELL_HEIGHT / 2}
                        rx={SAMPLE_WELL_WIDTH / 2}
                        ry={SAMPLE_WELL_HEIGHT / 2}
                        stroke={guideColor}
                        strokeWidth={1.5}
                        fill="none"
                        strokeOpacity={0.5}
                    />
                </Svg>
            )}
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