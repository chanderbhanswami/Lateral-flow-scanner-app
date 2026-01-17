import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import {
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

const { width, height } = Dimensions.get('window');

// Camera preview is 3:4 aspect ratio
const CAMERA_HEIGHT = width * (4 / 3);

interface BorderGuideProps {
    corners: Array<{ x: number; y: number }>;
    color: string;
    isDetected: boolean;
}

export const BorderGuide: React.FC<BorderGuideProps> = ({ corners, color, isDetected }) => {
    // Use green when detected, red/orange otherwise
    const guideColor = isDetected ? '#10b981' : color;
    const cornerSize = 15;

    return (
        <View style={styles.container} pointerEvents="none">
            <Svg width={width} height={CAMERA_HEIGHT}>
                {!isDetected || corners.length !== 4 ? (
                    // Default guide rectangle (Cassette Shape)
                    <>
                        {/* Main Cassette Outline - SOLID line */}
                        <Rect
                            x={GUIDE_X}
                            y={GUIDE_Y}
                            width={CASSETTE_WIDTH}
                            height={CASSETTE_HEIGHT}
                            rx={8}
                            ry={8}
                            stroke={guideColor}
                            strokeWidth={2.5}
                            fill="none"
                        />

                        {/* Result Window (Inner Box) - SOLID line */}
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

                        {/* Sample Well (Oval/Circle at bottom) - SOLID line */}
                        <Rect
                            x={GUIDE_X + SAMPLE_WELL_X_OFFSET}
                            y={GUIDE_Y + SAMPLE_WELL_Y_OFFSET}
                            width={SAMPLE_WELL_WIDTH}
                            height={SAMPLE_WELL_HEIGHT}
                            rx={SAMPLE_WELL_HEIGHT / 2}
                            ry={SAMPLE_WELL_HEIGHT / 2}
                            stroke={guideColor}
                            strokeWidth={1.5}
                            fill="none"
                        />

                        {/* Corner markers for alignment guidance */}
                        {[
                            // Top-left corner
                            { x: GUIDE_X, y: GUIDE_Y, hDir: 1, vDir: 1 },
                            // Top-right corner
                            { x: GUIDE_X + CASSETTE_WIDTH, y: GUIDE_Y, hDir: -1, vDir: 1 },
                            // Bottom-right corner
                            { x: GUIDE_X + CASSETTE_WIDTH, y: GUIDE_Y + CASSETTE_HEIGHT, hDir: -1, vDir: -1 },
                            // Bottom-left corner
                            { x: GUIDE_X, y: GUIDE_Y + CASSETTE_HEIGHT, hDir: 1, vDir: -1 },
                        ].map((corner, i) => (
                            <React.Fragment key={i}>
                                {/* Horizontal line */}
                                <Line
                                    x1={corner.x}
                                    y1={corner.y}
                                    x2={corner.x + (cornerSize * corner.hDir)}
                                    y2={corner.y}
                                    stroke={guideColor}
                                    strokeWidth={3}
                                />
                                {/* Vertical line */}
                                <Line
                                    x1={corner.x}
                                    y1={corner.y}
                                    x2={corner.x}
                                    y2={corner.y + (cornerSize * corner.vDir)}
                                    stroke={guideColor}
                                    strokeWidth={3}
                                />
                            </React.Fragment>
                        ))}
                    </>
                ) : (
                    // Detected cassette border - draw lines between detected corners
                    <>
                        <Line
                            x1={corners[0].x}
                            y1={corners[0].y}
                            x2={corners[1].x}
                            y2={corners[1].y}
                            stroke={guideColor}
                            strokeWidth={3}
                        />
                        <Line
                            x1={corners[1].x}
                            y1={corners[1].y}
                            x2={corners[2].x}
                            y2={corners[2].y}
                            stroke={guideColor}
                            strokeWidth={3}
                        />
                        <Line
                            x1={corners[2].x}
                            y1={corners[2].y}
                            x2={corners[3].x}
                            y2={corners[3].y}
                            stroke={guideColor}
                            strokeWidth={3}
                        />
                        <Line
                            x1={corners[3].x}
                            y1={corners[3].y}
                            x2={corners[0].x}
                            y2={corners[0].y}
                            stroke={guideColor}
                            strokeWidth={3}
                        />
                    </>
                )}
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