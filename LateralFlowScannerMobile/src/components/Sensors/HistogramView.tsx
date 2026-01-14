import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { HistogramData } from '../../types';

interface HistogramViewProps {
    data: HistogramData;
    width?: number;
    height?: number;
}

export const HistogramView: React.FC<HistogramViewProps> = ({
    data,
    width = Dimensions.get('window').width - 32,
    height = 150,
}) => {
    const maxValue = Math.max(
        ...data.red,
        ...data.green,
        ...data.blue,
        ...data.brightness
    );

    const barWidth = width / 256;
    const scale = height / maxValue;

    return (
        <View style={styles.container}>
            <Svg width={width} height={height}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                    <Line
                        key={i}
                        x1={0}
                        y1={height * ratio}
                        x2={width}
                        y2={height * ratio}
                        stroke="#e5e7eb"
                        strokeWidth={1}
                        opacity={0.3}
                    />
                ))}

                {/* Red channel */}
                {data.red.map((value, i) => (
                    <Rect
                        key={`r-${i}`}
                        x={i * barWidth}
                        y={height - value * scale}
                        width={barWidth}
                        height={value * scale}
                        fill="#ef4444"
                        opacity={0.3}
                    />
                ))}

                {/* Green channel */}
                {data.green.map((value, i) => (
                    <Rect
                        key={`g-${i}`}
                        x={i * barWidth}
                        y={height - value * scale}
                        width={barWidth}
                        height={value * scale}
                        fill="#10b981"
                        opacity={0.3}
                    />
                ))}

                {/* Blue channel */}
                {data.blue.map((value, i) => (
                    <Rect
                        key={`b-${i}`}
                        x={i * barWidth}
                        y={height - value * scale}
                        width={barWidth}
                        height={value * scale}
                        fill="#3b82f6"
                        opacity={0.3}
                    />
                ))}

                {/* Axis labels */}
                <SvgText x={5} y={15} fill="#6b7280" fontSize={10}>
                    {maxValue.toFixed(0)}
                </SvgText>
                <SvgText x={5} y={height - 5} fill="#6b7280" fontSize={10}>
                    0
                </SvgText>
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 8,
    },
});