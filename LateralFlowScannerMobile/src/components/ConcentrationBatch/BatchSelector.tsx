import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useConcentrationBatch } from '../../hooks/useConcentrationBatch';
import { Modal } from '../UI/Modal';
import { BatchForm } from './BatchForm';
import { Button } from '../UI/Button';
import { moderateScale, verticalScale, scale } from '../../utils/responsive';

interface BatchSelectorProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (batch: any) => void;
}

export const BatchSelector: React.FC<BatchSelectorProps> = ({ visible, onClose, onSelect }) => {
    const { batches, createBatch } = useConcentrationBatch();
    const [showForm, setShowForm] = useState(false);

    const handleCreate = async (data: any) => {
        const batch = await createBatch(data);
        setShowForm(false);
        onSelect(batch);
    };

    return (
        <Modal visible={visible} onClose={onClose}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Select Concentration</Text>
                    <Button title="Add New" onPress={() => setShowForm(true)} size="small" />
                </View>

                {showForm ? (
                    <BatchForm
                        onSubmit={handleCreate}
                        onCancel={() => setShowForm(false)}
                    />
                ) : (
                    <FlatList
                        data={batches}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.item}
                                onPress={() => onSelect(item)}
                            >
                                <View style={[styles.colorIndicator, { backgroundColor: item.color || '#3b82f6' }]} />
                                <View style={styles.itemContent}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemConcentration}>
                                        {item.concentration} {item.unit}
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#9ca3af" />
                            </TouchableOpacity>
                        )}
                        keyExtractor={(item) => item.id}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={styles.emptyText}>No batches found</Text>
                                <Text style={styles.emptySubtext}>Create a new batch to get started</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: moderateScale(12),
        width: '100%',
        flex: 1, // Allow it to fill the Modal content area
    },
    header: {
        flexDirection: 'column',
        padding: moderateScale(20),
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        gap: verticalScale(12),
    },
    title: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: '#1f2937',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: moderateScale(16),
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    colorIndicator: {
        width: moderateScale(4),
        height: verticalScale(40),
        borderRadius: moderateScale(2),
        marginRight: moderateScale(12),
    },
    itemContent: {
        flex: 1,
    },
    itemName: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: verticalScale(4),
    },
    itemConcentration: {
        fontSize: moderateScale(14),
        color: '#6b7280',
    },
    empty: {
        padding: moderateScale(40),
        alignItems: 'center',
    },
    emptyText: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: verticalScale(8),
    },
    emptySubtext: {
        fontSize: moderateScale(14),
        color: '#9ca3af',
    },
});