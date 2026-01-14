import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { ExposureAnalysis } from '../../types';

interface ExposureMeterProps {
    analysis: ExposureAnalysis | null;
    visible?: boolean;
}

export const ExposureMeter: React.FC<ExposureMeterProps> = ({ analysis, visible = true }) => {
    if (!visible || !analysis) return null;

    // Convert normalized exposure (0-1) to rough EV scale (-2 to +2)
    // Assuming 0.5 is "optimal" (0 EV)
    const ev = (analysis.exposureLevel - 0.5) * 4;
    const clampedEv = Math.max(-2, Math.min(2, ev));
    const percentage = ((clampedEv + 2) / 4) * 100;

    const getStatusColor = () => {
        if (analysis.isUnderexposed || analysis.isOverexposed) return '#ef4444'; // Red
        if (Math.abs(ev) > 1) return '#f59e0b'; // Yellow
        return '#10b981'; // Green
    };

    return (
        <View style={styles.container}>
            <View style={styles.meterBackground}>
                <View style={styles.centerMarker} />
                <View
                    style={[
                        styles.indicator,
                        { left: `${percentage}%`, backgroundColor: getStatusColor() }
                    ]}
                />
            </View>
            <View style={styles.labels}>
                <Text style={styles.text}>-2</Text>
                <Text style={styles.text}>0</Text>
                <Text style={styles.text}>+2</Text>
            </View>
            {analysis.recommendation ? (
                <Text style={[styles.recommendation, { color: getStatusColor() }]}>
                    {analysis.recommendation}
                </Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 150,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 8,
        padding: 8,
    },
    meterBackground: {
        height: 4,
        backgroundColor: '#4b5563',
        borderRadius: 2,
        marginVertical: 8,
        position: 'relative',
    },
    centerMarker: {
        position: 'absolute',
        left: '50%',
        top: -4,
        bottom: -4,
        width: 2,
        backgroundColor: '#fff',
    },
    indicator: {
        position: 'absolute',
        top: -6,
        width: 12,
        height: 16,
        borderRadius: 6,
        marginLeft: -6, // Center the indicator
        borderWidth: 2,
        borderColor: '#fff',
    },
    labels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    text: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    recommendation: {
        fontSize: 10,
        textAlign: 'center',
        marginTop: 4,
        fontWeight: '500',
    }
});
