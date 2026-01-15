import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface CustomDialogProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    onClose?: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    loading?: boolean;
}

export const CustomDialog: React.FC<CustomDialogProps> = ({
    visible,
    title,
    message,
    type = 'info',
    onClose,
    onConfirm,
    confirmText = 'OK',
    cancelText = 'Cancel',
    showCancel = false,
    loading = false,
}) => {
    const getIcon = () => {
        switch (type) {
            case 'success':
                return { name: 'check-circle', color: '#10b981' };
            case 'warning':
                return { name: 'alert', color: '#f59e0b' };
            case 'error':
                return { name: 'close-circle', color: '#ef4444' };
            default:
                return { name: 'information', color: '#3b82f6' };
        }
    };

    const icon = getIcon();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
                            <Icon name={icon.name} size={32} color={icon.color} />
                        </View>
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttons}>
                        {showCancel && (
                            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
                                <Text style={styles.cancelButtonText}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.confirmButton, { backgroundColor: icon.color }]}
                            onPress={onConfirm || onClose}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.confirmButtonText}>{confirmText}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    content: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    header: {
        marginBottom: 16,
    },
    iconContainer: {
        padding: 16,
        borderRadius: 50,
        marginBottom: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttons: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4b5563',
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});
