import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

interface LoadingProps {
    text?: string;
    size?: 'small' | 'large';
}

export const Loading: React.FC<LoadingProps> = ({ text, size = 'large' }) => {
    return (
        <View style={styles.container}>
            <ActivityIndicator size={size} color="#3b82f6" />
            {text && <Text style={styles.text}>{text}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    text: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
});