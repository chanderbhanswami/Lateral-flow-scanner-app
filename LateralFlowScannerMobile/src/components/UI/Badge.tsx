import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface BadgeProps {
    text: string;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ text, variant = 'primary', style }) => {
    return (
        <View style={[styles.badge, styles[variant], style]}>
            <Text style={[styles.text, styles[`${variant}Text`]]}>{text}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    primary: {
        backgroundColor: '#dbeafe',
    },
    success: {
        backgroundColor: '#d1fae5',
    },
    warning: {
        backgroundColor: '#fef3c7',
    },
    danger: {
        backgroundColor: '#fee2e2',
    },
    info: {
        backgroundColor: '#e0e7ff',
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
    primaryText: {
        color: '#1e40af',
    },
    successText: {
        color: '#065f46',
    },
    warningText: {
        color: '#92400e',
    },
    dangerText: {
        color: '#991b1b',
    },
    infoText: {
        color: '#3730a3',
    },
});