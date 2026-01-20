import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ConcentrationBatch } from '../../types';
import { Card } from '../UI/Card';
import { moderateScale, verticalScale, scale } from '../../utils/responsive';

interface BatchItemProps {
    batch: ConcentrationBatch;
    onEdit: () => void;
    onDelete: () => void;
}

export const BatchItem: React.FC<BatchItemProps> = ({ batch, onEdit, onDelete }) => {
    return (
        <Card style={styles.container}>
            <View style={[styles.colorIndicator, { backgroundColor: batch.color || '#3b82f6' }]} />
            <View style={styles.content}>
                <Text style={styles.name}>{batch.name}</Text>
                <Text style={styles.concentration}>
                    {batch.concentration} {batch.unit}
                </Text>
                {batch.description && (
                    <Text style={styles.description}>{batch.description}</Text>
                )}
            </View>
            <View style={styles.actions}>
                <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
                    <Icon name="pencil" size={20} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
                    <Icon name="delete" size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: moderateScale(16),
        marginBottom: verticalScale(12),
    },
    colorIndicator: {
        width: moderateScale(4),
        height: '100%',
        borderRadius: moderateScale(2),
        marginRight: moderateScale(12),
    },
    content: {
        flex: 1,
    },
    name: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: verticalScale(4),
    },
    concentration: {
        fontSize: moderateScale(14),
        color: '#6b7280',
        marginBottom: verticalScale(2),
    },
    description: {
        fontSize: moderateScale(12),
        color: '#9ca3af',
    },
    actions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: moderateScale(8),
        marginLeft: moderateScale(8),
    },
});