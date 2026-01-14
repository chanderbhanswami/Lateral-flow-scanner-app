import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Slider from '@react-native-community/slider';

interface ExposureSliderProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
}

export const ExposureSlider: React.FC<ExposureSliderProps> = ({
    value,
    onChange,
    min = -2,
    max = 2,
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Exposure</Text>
            <View style={styles.sliderContainer}>
                <Text style={styles.value}>{min}</Text>
                <Slider
                    style={styles.slider}
                    minimumValue={min}
                    maximumValue={max}
                    value={value}
                    onValueChange={onChange}
                    minimumTrackTintColor="#3b82f6"
                    maximumTrackTintColor="#d1d5db"
                    thumbTintColor="#3b82f6"
                />
                <Text style={styles.value}>{max}</Text>
            </View>
            <Text style={styles.currentValue}>{value.toFixed(1)}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 8,
        padding: 12,
        minWidth: 200,
    },
    label: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    value: {
        color: '#fff',
        fontSize: 12,
        width: 30,
        textAlign: 'center',
    },
    slider: {
        flex: 1,
        marginHorizontal: 8,
    },
    currentValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 8,
        textAlign: 'center',
    },
});