import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';

interface CardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
    return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
});