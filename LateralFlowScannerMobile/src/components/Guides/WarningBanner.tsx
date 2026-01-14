import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface WarningBannerProps {
    warnings: string[];
}

export const WarningBanner: React.FC<WarningBannerProps> = ({ warnings }) => {
    if (warnings.length === 0) return null;

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {warnings.map((warning, index) => (
                    <View key={index} style={styles.warningItem}>
                        <Icon name="alert-circle" size={16} color="#f59e0b" />
                        <Text style={styles.warningText}>{warning}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    warningItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(251, 191, 36, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        marginRight: 8,
    },
    warningText: {
        color: '#78350f',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
});