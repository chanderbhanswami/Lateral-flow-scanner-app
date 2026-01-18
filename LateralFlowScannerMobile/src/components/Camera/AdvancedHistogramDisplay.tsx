import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Svg, { Path, G, Rect } from 'react-native-svg';
import { HistogramData } from '../../types';

interface AdvancedHistogramDisplayProps {
    data: HistogramData | null;
    width?: number;
    height?: number;
    mode: 'luminance' | 'rgb';
    visible?: boolean;
}

export const AdvancedHistogramDisplay: React.FC<AdvancedHistogramDisplayProps> = ({
    data,
    width = 140,
    height = 80,
    mode = 'luminance',
    visible = true,
}) => {
    if (!visible || !data) return null;

    const createPath = (values: number[] | undefined, color: string, strokeWidth: number = 1.5) => {
        if (!values || values.length === 0) return null;

        // Find max value to normalize height
        // Use a minimum max value to avoid division by zero or huge spikes on dark images
        const maxVal = Math.max(...values, 10);

        const pathData = values.map((val, i) => {
            const x = (i / 255) * width;
            const y = height - (val / maxVal) * height; // Invert Y because SVG 0 is top
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');

        return (
            <Path
                d={`M0,${height} L${pathData} L${width},${height}`}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
            />
        );
    };

    return (
        <View style={[styles.container, { width, height }]}>
            <View style={styles.labelContainer}>
                <Text style={styles.label}>{mode === 'luminance' ? 'Luminance' : 'RGB Channels'}</Text>
            </View>
            <Svg width={width} height={height} style={styles.svg}>
                {/* Background Grid/Guide */}
                <Rect x="0" y="0" width={width} height={height} fill="rgba(0,0,0,0.3)" />

                {mode === 'luminance' ? (
                    createPath(data.brightness, '#ffffff', 2)
                ) : (
                    <G>
                        {createPath(data.red, '#ef4444')}
                        {createPath(data.green, '#10b981')}
                        {createPath(data.blue, '#3b82f6')}
                    </G>
                )}
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 8,
    },
    svg: {
        borderRadius: 4,
    },
    labelContainer: {
        position: 'absolute',
        top: 2,
        left: 4,
        zIndex: 10,
    },
    label: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
    }
});
