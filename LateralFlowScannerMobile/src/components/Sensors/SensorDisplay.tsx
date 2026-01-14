import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { AllSensorData, AlignmentAnalysis } from '../../types';

interface SensorDisplayProps {
    sensorData: AllSensorData | null;
    lightLevel: number;
    isShaking: boolean;
    alignment: AlignmentAnalysis | null;
}

export const SensorDisplay: React.FC<SensorDisplayProps> = ({
    sensorData,
    lightLevel,
    isShaking,
    alignment,
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.item}>
                <Text style={styles.label}>Light:</Text>
                <Text style={styles.value}>{lightLevel.toFixed(0)} lux</Text>
            </View>

            <View style={styles.item}>
                <Text style={styles.label}>Shake:</Text>
                <Text style={[styles.value, isShaking && styles.warning]}>
                    {isShaking ? 'Yes' : 'No'}
                </Text>
            </View>

            {alignment && (
                <>
                    <View style={styles.item}>
                        <Text style={styles.label}>Pitch:</Text>
                        <Text style={styles.value}>{alignment.pitch.toFixed(1)}°</Text>
                    </View>

                    <View style={styles.item}>
                        <Text style={styles.label}>Roll:</Text>
                        <Text style={styles.value}>{alignment.roll.toFixed(1)}°</Text>
                    </View>

                    <View style={styles.item}>
                        <Text style={styles.label}>Level:</Text>
                        <Text style={[styles.value, alignment.isAligned && styles.success]}>
                            {(alignment.levelness * 100).toFixed(0)}%
                        </Text>
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 180,
        left: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 12,
        borderRadius: 8,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    label: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
        marginRight: 12,
    },
    value: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    warning: {
        color: '#fbbf24',
    },
    success: {
        color: '#10b981',
    },
});