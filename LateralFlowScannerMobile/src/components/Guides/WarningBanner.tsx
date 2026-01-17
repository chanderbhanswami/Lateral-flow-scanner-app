import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export interface FeedbackMessage {
    type: 'warning' | 'error' | 'success' | 'info';
    message: string;
    icon?: string;
}

interface WarningBannerProps {
    warnings?: string[]; // Legacy support
    messages?: FeedbackMessage[]; // New typed messages
}

const getMessageStyle = (type: FeedbackMessage['type']) => {
    switch (type) {
        case 'error':
            return { bg: 'rgba(239, 68, 68, 0.95)', text: '#ffffff', icon: 'alert-circle' };
        case 'warning':
            return { bg: 'rgba(251, 191, 36, 0.95)', text: '#78350f', icon: 'alert' };
        case 'success':
            return { bg: 'rgba(34, 197, 94, 0.95)', text: '#ffffff', icon: 'check-circle' };
        case 'info':
        default:
            return { bg: 'rgba(59, 130, 246, 0.95)', text: '#ffffff', icon: 'information' };
    }
};

export const WarningBanner: React.FC<WarningBannerProps> = ({ warnings = [], messages = [] }) => {
    // Convert legacy warnings to new format
    const allMessages: FeedbackMessage[] = [
        ...messages,
        ...warnings.map(w => ({ type: 'warning' as const, message: w }))
    ];

    if (allMessages.length === 0) return null;

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {allMessages.map((msg, index) => {
                    const style = getMessageStyle(msg.type);
                    return (
                        <View key={index} style={[styles.messageItem, { backgroundColor: style.bg }]}>
                            <Icon name={msg.icon || style.icon} size={16} color={style.text} />
                            <Text style={[styles.messageText, { color: style.text }]}>{msg.message}</Text>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 10,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    scrollContent: {
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    messageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    messageText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
});