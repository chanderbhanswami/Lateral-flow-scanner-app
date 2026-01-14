import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface BorderGuideProps {
    corners: Array<{ x: number; y: number }>;
    color: string;
    isDetected: boolean;
}

export const BorderGuide: React.FC<BorderGuideProps> = ({ corners, color, isDetected }) => {
    const defaultGuideSize = {
        width: width * 0.8,
        height: height * 0.4,
        x: width * 0.1,
        y: height * 0.3,
    };

    return (
        <View style={styles.container} pointerEvents="none">
            <Svg width={width} height={height}>
                {!isDetected || corners.length !== 4 ? (
                    // Default guide rectangle
                    <>
                        <Rect
                            x={defaultGuideSize.x}
                            y={defaultGuideSize.y}
                            width={defaultGuideSize.width}
                            height={defaultGuideSize.height}
                            stroke={color}
                            strokeWidth={3}
                            fill="none"
                            strokeDasharray="10,10"
                        />
                        {/* Corner markers */}
                        {[
                            [defaultGuideSize.x, defaultGuideSize.y],
                            [defaultGuideSize.x + defaultGuideSize.width, defaultGuideSize.y],
                            [defaultGuideSize.x + defaultGuideSize.width, defaultGuideSize.y + defaultGuideSize.height],
                            [defaultGuideSize.x, defaultGuideSize.y + defaultGuideSize.height],
                        ].map(([x, y], i) => (
                            <React.Fragment key={i}>
                                <Line x1={x - 20} y1={y} x2={x + 20} y2={y} stroke={color} strokeWidth={3} />
                                <Line x1={x} y1={y - 20} x2={x} y2={y + 20} stroke={color} strokeWidth={3} />
                            </React.Fragment>
                        ))}
                    </>
                ) : (
                    // Detected cassette border
                    <>
                        <Line
                            x1={corners[0].x}
                            y1={corners[0].y}
                            x2={corners[1].x}
                            y2={corners[1].y}
                            stroke={color}
                            strokeWidth={4}
                        />
                        <Line
                            x1={corners[1].x}
                            y1={corners[1].y}
                            x2={corners[2].x}
                            y2={corners[2].y}
                            stroke={color}
                            strokeWidth={4}
                        />
                        <Line
                            x1={corners[2].x}
                            y1={corners[2].y}
                            x2={corners[3].x}
                            y2={corners[3].y}
                            stroke={color}
                            strokeWidth={4}
                        />
                        <Line
                            x1={corners[3].x}
                            y1={corners[3].y}
                            x2={corners[0].x}
                            y2={corners[0].y}
                            stroke={color}
                            strokeWidth={4}
                        />
                    </>
                )}
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
    },
});