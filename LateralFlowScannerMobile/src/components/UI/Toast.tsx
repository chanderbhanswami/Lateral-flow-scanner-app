import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ToastProps {
    type: 'success' | 'error' | 'warning' | 'info';
    text1: string;
    text2?: string;
    onPress?: () => void;
    onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
    type,
    text1,
    text2,
    onPress,
    onClose,
}) => {
    const getIconName = () => {
        switch (type) {
            case 'success':
                return 'check-circle';
            case 'error':
                return 'alert-circle';
            case 'warning':
                return 'alert';
            case 'info':
                return 'information';
            default:
                return 'information';
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'success':
                return '#10b981';
            case 'error':
                return '#ef4444';
            case 'warning':
                return '#f59e0b';
            case 'info':
                return '#3b82f6';
            default:
                return '#3b82f6';
        }
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'success':
                return '#d1fae5';
            case 'error':
                return '#fee2e2';
            case 'warning':
                return '#fef3c7';
            case 'info':
                return '#dbeafe';
            default:
                return '#dbeafe';
        }
    };

    const getBorderColor = () => {
        switch (type) {
            case 'success':
                return '#10b981';
            case 'error':
                return '#ef4444';
            case 'warning':
                return '#f59e0b';
            case 'info':
                return '#3b82f6';
            default:
                return '#3b82f6';
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(),
                    borderLeftColor: getBorderColor(),
                },
            ]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <Icon name={getIconName()} size={24} color={getIconColor()} />

            <View style={styles.textContainer}>
                <Text style={styles.text1}>{text1}</Text>
                {text2 && <Text style={styles.text2}>{text2}</Text>}
            </View>

            {onClose && (
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Icon name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginHorizontal: 16,
        marginVertical: 8,
    },
    textContainer: {
        flex: 1,
        marginLeft: 12,
    },
    text1: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    text2: {
        fontSize: 14,
        color: '#4b5563',
    },
    closeButton: {
        padding: 4,
        marginLeft: 8,
    },
});