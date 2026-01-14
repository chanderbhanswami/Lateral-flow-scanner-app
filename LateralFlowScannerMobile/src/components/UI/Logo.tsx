import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';

interface LogoProps {
    size?: 'small' | 'medium' | 'large';
    style?: ViewStyle;
}

const SIZES = {
    small: 48,
    medium: 80,
    large: 120,
};

export const Logo: React.FC<LogoProps> = ({ size = 'medium', style }) => {
    const dimension = SIZES[size];

    return (
        <View style={[styles.container, { width: dimension, height: dimension }, style]}>
            <Image
                source={require('../../assets/images/icon.png')}
                style={[styles.logo, { width: dimension, height: dimension, borderRadius: dimension * 0.25 }]}
                resizeMode="contain"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        // Dynamic sizing applied via inline styles
    },
});
