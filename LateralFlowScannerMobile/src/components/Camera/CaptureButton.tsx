import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Animated, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface CaptureButtonProps {
    onPress: () => void;
    disabled?: boolean;
    isCapturing?: boolean;
    size?: number;
}

export const CaptureButton: React.FC<CaptureButtonProps> = ({
    onPress,
    disabled = false,
    isCapturing = false,
    size = 80,
}) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isCapturing) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isCapturing]);

    return (
        <TouchableOpacity
            style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
            onPress={onPress}
            disabled={disabled || isCapturing}
            activeOpacity={0.7}
        >
            <Animated.View
                style={[
                    styles.button,
                    {
                        transform: [{ scale: pulseAnim }],
                        opacity: disabled ? 0.5 : 1,
                    },
                ]}
            >
                {isCapturing ? (
                    <Icon name="loading" size={32} color="#fff" />
                ) : (
                    <View style={styles.innerCircle} />
                )}
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#10b981',
    },
    button: {
        width: '75%',
        height: '75%',
        borderRadius: 1000,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerCircle: {
        width: '100%',
        height: '100%',
        borderRadius: 1000,
    },
});