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
    sourceWidth?: number;
    sourceHeight?: number;
}

export const BorderGuide: React.FC<BorderGuideProps> = ({ corners, color, isDetected, sourceWidth, sourceHeight }) => {
    // Use green when detected, otherwise use provided color
    const guideColor = isDetected ? '#10b981' : color || '#ef4444';

    // Scale factors: Coordinates are now NORMALIZED (0-1) from useFrameProcessor
    // So we just multiply by the screen/camera dimensions to position them.
    const scaleX = CAMERA_WIDTH;
    const scaleY = CAMERA_HEIGHT;

    const renderDynamicGuide = () => {
        if (!isDetected || !corners || corners.length !== 4) return null;

        // NEW: Aspect Ratio Correction for resizeMode="cover"
        // The sensor output (detected corners) is relative to the FULL transformed image (e.g. 480x640)
        // The View (Screen) is taller/narrower (e.g. 1080x2400)
        // "Cover" scales the image to match HEIGHT (typically) and crops WIDTH, or matches WIDTH and crops HEIGHT.

        // Source Dimensions (from useFrameProcessor, swapped for portrait)
        // Default to a 3:4 aspect ratio if not provided (Standard Sensor)
        const srcW = sourceWidth || 480;
        const srcH = sourceHeight || 640;
        const srcAspect = srcW / srcH; // ~0.75

        // View Dimensions
        const viewW = CAMERA_WIDTH;
        const viewH = CAMERA_HEIGHT;
        const viewAspect = viewW / viewH; // ~0.45 (20:9)

        // Calculate Scale to "Cover"
        // If View is "Narrower" (Taller) than Source, we match Height and Crop Width.
        // If View is "Wider" (Shorter) than Source, we match Width and Crop Height.
        let scale, offsetX, offsetY;

        if (viewAspect < srcAspect) {
            // View is narrower (Typical Portrait Phone)
            // Scale to match Height
            scale = viewH / srcH;
            const scaledW = srcW * scale;
            offsetX = (viewW - scaledW) / 2; // Negative offset usually (centered)
            offsetY = 0;
        } else {
            // View is wider (Tablet?)
            // Scale to match Width
            scale = viewW / srcW;
            const scaledH = srcH * scale;
            offsetX = 0;
            offsetY = (viewH - scaledH) / 2;
        }

        // Map Normalized Corners (0-1) to Screen Pixels
        const points = corners
            .map(p => {
                // De-normalize to Source Pixels
                const pxSrc = p.x * srcW;
                const pySrc = p.y * srcH;

                // Scale and Offset to View Pixels
                const pxView = (pxSrc * scale) + offsetX;
                const pyView = (pySrc * scale) + offsetY;

                return `${pxView},${pyView}`;
            })
            .join(' ');

        // Compute Circle Centers
        const circlePoints = corners.map(p => {
            const pxSrc = p.x * srcW;
            const pySrc = p.y * srcH;
            return {
                cx: (pxSrc * scale) + offsetX,
                cy: (pySrc * scale) + offsetY
            };
        });

        return (
            <Svg width={CAMERA_WIDTH} height={CAMERA_HEIGHT} style={StyleSheet.absoluteFill}>
                <Polygon
                    points={points}
                    stroke={guideColor}
                    strokeWidth={3}
                    fill="rgba(16, 185, 129, 0.2)" // Light green transparent fill
                />

                {/* Draw corners with circles for better visibility */}
                {circlePoints.map((p, i) => (
                    <Circle
                        key={i}
                        cx={p.cx}
                        cy={p.cy}
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
                    // strokeDasharray="10 5" // Removed for solid line as requested
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