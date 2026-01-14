import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface InstructionCardProps {
    icon: string;
    title: string;
    description: string;
    type?: 'info' | 'warning' | 'success' | 'error';
}

export const InstructionCard: React.FC<InstructionCardProps> = ({
    icon,
    title,
    description,
    type = 'info',
}) => {
    const getBackgroundColor = () => {
        switch (type) {
            case 'warning':
                return '#fef3c7';
            case 'success':
                return '#d1fae5';
            case 'error':
                return '#fee2e2';
            default:
                return '#dbeafe';
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'warning':
                return '#f59e0b';
            case 'success':
                return '#10b981';
            case 'error':
                return '#ef4444';
            default:
                return '#3b82f6';
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
            <Icon name={icon} size={32} color={getIconColor()} style={styles.icon} />
            <View style={styles.content}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    icon: {
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
    },
});