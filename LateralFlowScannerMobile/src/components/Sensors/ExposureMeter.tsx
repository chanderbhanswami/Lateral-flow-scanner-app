import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { ExposureAnalysis } from '../../types';

interface ExposureMeterProps {
    analysis: ExposureAnalysis;
}

export const ExposureMeter: React.FC<ExposureMeterProps> = ({ analysis }) => {
    const getColor = () => {
        if (analysis.isUnderexposed) return '#ef4444';
        if (analysis.isOverexposed) return '#f59e0b';
        return '#10b981';
    };

    const getLabel = () => {
        if (analysis.isUnderexposed) return 'Underexposed';
        if (analysis.isOverexposed) return 'Overexposed';
        return 'Good Exposure';
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Exposure</Text>

            <View style={styles.meter}>
                <View style={styles.meterTrack}>
                    <View
                        style={[
                            styles.meterFill,
                            {
                                width: `${analysis.exposureLevel * 100}%`,
                                backgroundColor: getColor(),
                            },
                        ]}
                    />
                </View>

                <View style={[styles.indicator, { left: `${analysis.exposureLevel * 100}%` }]} />
            </View>

            <Text style={[styles.status, { color: getColor() }]}>
                {getLabel()}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 8,
        padding: 12,
    },
    label: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    meter: {
        height: 24,
        position: 'relative',
        marginBottom: 8,
    },
    meterTrack: {
        height: 8,
        backgroundColor: '#374151',
        borderRadius: 4,
        overflow: 'hidden',
    },
    meterFill: {
        height: '100%',
        borderRadius: 4,
    },
    indicator: {
        position: 'absolute',
        top: 0,
        width: 2,
        height: 24,
        backgroundColor: '#fff',
        marginLeft: -1,
    },
    status: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
    },
});