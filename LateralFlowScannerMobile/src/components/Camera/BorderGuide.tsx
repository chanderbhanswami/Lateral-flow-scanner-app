import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Path } from 'react-native-svg';
import {
    CASSETTE_WIDTH,
    CASSETTE_HEIGHT,
    GUIDE_X,
    GUIDE_Y,
    WINDOW_WIDTH,
    WINDOW_HEIGHT,
    WINDOW_Y_OFFSET,
    SAMPLE_WELL_RADIUS,
    SAMPLE_WELL_Y_OFFSET
} from '../../constants/layout';

const { width, height } = Dimensions.get('window');

interface BorderGuideProps {
    corners: Array<{ x: number; y: number }>;
    color: string;
    isDetected: boolean;
}

export const BorderGuide: React.FC<BorderGuideProps> = ({ corners, color, isDetected }) => {

    return (
        <View style={styles.container} pointerEvents="none">
            <Svg width={width} height={height}>
                {!isDetected || corners.length !== 4 ? (
                    // Default guide rectangle (Cassette Shape)
                    <>
                        {/* Main Body Outline */}
                        <Rect
                            x={GUIDE_X}
                            y={GUIDE_Y}
                            width={CASSETTE_WIDTH}
                            height={CASSETTE_HEIGHT}
                            rx={20} // Rounded corners
                            ry={20}
                            stroke={color}
                            strokeWidth={3}
                            fill="none"
                            strokeDasharray="10,10"
                        />

                        {/* Result Window (Inner Box) */}
                        <Rect
                            x={GUIDE_X + (CASSETTE_WIDTH - WINDOW_WIDTH) / 2}
                            y={GUIDE_Y + WINDOW_Y_OFFSET}
                            width={WINDOW_WIDTH}
                            height={WINDOW_HEIGHT}
                            rx={5}
                            ry={5}
                            stroke={color}
                            strokeWidth={2}
                            fill="none"
                            strokeDasharray="5,5"
                        />

                        {/* Sample Well (Circle/Oval at bottom) */}
                        <Rect
                            x={GUIDE_X + (CASSETTE_WIDTH / 2) - SAMPLE_WELL_radius}
                            y={GUIDE_Y + SAMPLE_WELL_Y_OFFSET}
                            width={SAMPLE_WELL_radius * 2}
                            height={SAMPLE_WELL_radius * 2}
                            rx={SAMPLE_WELL_radius}
                            ry={SAMPLE_WELL_radius}
                            stroke={color}
                            strokeWidth={2}
                            fill="none"
                            strokeDasharray="5,5"
                        />

                        {/* Corner markers */}
                        {[
                            [GUIDE_X, GUIDE_Y],
                            [GUIDE_X + CASSETTE_WIDTH, GUIDE_Y],
                            [GUIDE_X + CASSETTE_WIDTH, GUIDE_Y + CASSETTE_HEIGHT],
                            [GUIDE_X, GUIDE_Y + CASSETTE_HEIGHT],
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