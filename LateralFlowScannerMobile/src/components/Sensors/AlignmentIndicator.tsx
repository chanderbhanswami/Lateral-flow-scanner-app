import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { AlignmentAnalysis } from '../../types';

interface AlignmentIndicatorProps {
    alignment: AlignmentAnalysis;
    compact?: boolean;
}

export const AlignmentIndicator: React.FC<AlignmentIndicatorProps> = ({ alignment, compact = false }) => {
    const size = compact ? 50 : 80;
    const center = size / 2;
    const maxTilt = 20; // degrees

    const pitchOffset = (alignment.pitch / maxTilt) * (center - 10);
    const rollOffset = (alignment.roll / maxTilt) * (center - 10);

    if (compact) {
        return (
            <View style={styles.compactContainer}>
                <Svg width={size} height={size}>
                    {/* Outer circle */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={center - 2}
                        stroke="#d1d5db"
                        strokeWidth={2}
                        fill="none"
                    />
                    {/* Center crosshair */}
                    <Line x1={center - 4} y1={center} x2={center + 4} y2={center} stroke="#9ca3af" strokeWidth={1} />
                    <Line x1={center} y1={center - 4} x2={center} y2={center + 4} stroke="#9ca3af" strokeWidth={1} />
                    {/* Indicator dot */}
                    <Circle
                        cx={center + rollOffset}
                        cy={center + pitchOffset}
                        r={5}
                        fill={alignment.isAligned ? '#10b981' : '#ef4444'}
                    />
                </Svg>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Alignment</Text>

            <Svg width={size} height={size}>
                {/* Outer circle */}
                <Circle
                    cx={center}
                    cy={center}
                    r={center - 2}
                    stroke="#374151"
                    strokeWidth={2}
                    fill="none"
                />

                {/* Center crosshair */}
                <Line
                    x1={center - 5}
                    y1={center}
                    x2={center + 5}
                    y2={center}
                    stroke="#6b7280"
                    strokeWidth={1}
                />
                <Line
                    x1={center}
                    y1={center - 5}
                    x2={center}
                    y2={center + 5}
                    stroke="#6b7280"
                    strokeWidth={1}
                />

                {/* Indicator dot */}
                <Circle
                    cx={center + rollOffset}
                    cy={center + pitchOffset}
                    r={6}
                    fill={alignment.isAligned ? '#10b981' : '#ef4444'}
                />
            </Svg>

            <Text style={[styles.status, { color: alignment.isAligned ? '#10b981' : '#ef4444' }]}>
                {alignment.isAligned ? 'Aligned' : 'Not Aligned'}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    compactContainer: {
        backgroundColor: '#f3f4f6',
        borderRadius: 25,
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    status: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 8,
    },
});