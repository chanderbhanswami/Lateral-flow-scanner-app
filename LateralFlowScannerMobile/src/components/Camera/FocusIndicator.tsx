import React, { useEffect } from 'react';
import { StyleSheet, View, Animated } from 'react-native';

interface FocusIndicatorProps {
    x: number;
    y: number;
    visible: boolean;
}

export const FocusIndicator: React.FC<FocusIndicatorProps> = ({ x, y, visible }) => {
    const scaleAnim = new Animated.Value(1.5);
    const opacityAnim = new Animated.Value(0);

    useEffect(() => {
        if (visible) {
            opacityAnim.setValue(1);
            scaleAnim.setValue(1.5);

            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.delay(200),
                    Animated.timing(opacityAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();
        }
    }, [visible, x, y]);

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    left: x - 40,
                    top: y - 40,
                    opacity: opacityAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <View style={styles.indicator} />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indicator: {
        width: 60,
        height: 60,
        borderWidth: 2,
        borderColor: '#fbbf24',
        borderRadius: 30,
    },
});