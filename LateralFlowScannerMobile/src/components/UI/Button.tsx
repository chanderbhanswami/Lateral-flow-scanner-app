import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, StyleProp } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'outline' | 'text';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    icon?: string;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    icon,
    style,
    textStyle,
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.button,
                variant === 'text' ? styles.textVariant : styles[variant],
                styles[size],
                (disabled || loading) && styles.disabled,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? '#fff' : '#3b82f6'} />
            ) : (
                <>
                    {icon && <Icon name={icon} size={20} color={variant === 'primary' ? '#fff' : '#3b82f6'} style={styles.icon} />}
                    <Text style={[styles.baseText, styles[`${variant}Text`], styles[`${size}Text`], textStyle]}>
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    primary: {
        backgroundColor: '#3b82f6',
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#3b82f6',
    },
    textVariant: {
        backgroundColor: 'transparent',
    },
    small: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    medium: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    large: {
        paddingHorizontal: 24,
        paddingVertical: 14,
    },
    disabled: {
        opacity: 0.5,
    },
    baseText: {
        fontWeight: '600',
    },
    primaryText: {
        color: '#fff',
    },
    outlineText: {
        color: '#3b82f6',
    },
    textText: {
        color: '#3b82f6',
    },
    smallText: {
        fontSize: 14,
    },
    mediumText: {
        fontSize: 16,
    },
    largeText: {
        fontSize: 18,
    },
    icon: {
        marginRight: 8,
    },
});