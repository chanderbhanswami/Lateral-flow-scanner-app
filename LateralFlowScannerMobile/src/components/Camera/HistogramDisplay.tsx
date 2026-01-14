import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { HistogramData } from '../../types';

interface HistogramDisplayProps {
    data: HistogramData | null;
    width?: number;
    height?: number;
    visible?: boolean;
}

export const HistogramDisplay: React.FC<HistogramDisplayProps> = ({
    data,
    width = 120,
    height = 60,
    visible = true,
}) => {
    if (!visible || !data) return null;

    const createPath = (values: number[], color: string) => {
        const maxVal = Math.max(...values, 1);
        const points = values.map((val, i) => {
            const x = (i / 255) * width;
            const y = height - (val / maxVal) * height;
            return `${x},${y}`;
        });

        return (
            <Path
                d={`M0,${height} L${points.join(' ')} L${width},${height}`}
                fill="none"
                stroke={color}
                strokeWidth={1}
                opacity={0.8}
            />
        );
    };

    return (
        <View style={[styles.container, { width, height }]}>
            <Svg width={width} height={height}>
                <G>
                    {createPath(data.red, '#ef4444')}
                    {createPath(data.green, '#10b981')}
                    {createPath(data.blue, '#3b82f6')}
                    {createPath(data.brightness, '#ffffff')}
                </G>
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 8,
        padding: 4,
        overflow: 'hidden',
    },
});
