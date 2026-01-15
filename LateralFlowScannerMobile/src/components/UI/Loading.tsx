import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Modal, Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface LoadingProps {
    text?: string;
    size?: 'small' | 'large';
    overlay?: boolean;
    visible?: boolean;
    color?: string;
}

export const Loading: React.FC<LoadingProps> = ({
    text,
    size = 'large',
    overlay = false,
    visible = true,
    color = '#3b82f6'
}) => {
    const spinValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        }
    }, [visible]);

    if (!visible) return null;

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const iconSize = size === 'large' ? 48 : 24;

    const Spinner = () => (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Icon name="loading" size={iconSize} color={color} />
        </Animated.View>
    );

    const Content = () => (
        <View style={[
            styles.container,
            overlay ? styles.overlayContainer : null,
            // If not overlay and not large, we want inline style (no flex:1 centered)
            !overlay && size === 'small' ? styles.inlineContainer : null
        ]}>
            <View style={overlay ? styles.card : styles.inlineWrapper}>
                <Spinner />
                {text && <Text style={[styles.text, size === 'small' && styles.smallText]}>{text}</Text>}
            </View>
        </View>
    );

    if (overlay) {
        return (
            <Modal transparent visible={visible} animationType="fade">
                <Content />
            </Modal>
        );
    }

    return <Content />;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    inlineContainer: {
        flex: 0,
        padding: 0,
    },
    inlineWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    overlayContainer: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
    },
    card: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        minWidth: 120,
    },
    text: {
        marginTop: 12,
        fontSize: 15,
        fontWeight: '500',
        color: '#4b5563',
        textAlign: 'center',
    },
    smallText: {
        marginTop: 0,
        fontSize: 14,
        marginLeft: 8,
    },
});