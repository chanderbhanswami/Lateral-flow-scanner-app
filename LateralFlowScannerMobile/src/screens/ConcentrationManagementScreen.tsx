import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useConcentrationBatch } from '../hooks/useConcentrationBatch';
import { BatchList } from '../components/ConcentrationBatch/BatchList';
import { BatchForm } from '../components/ConcentrationBatch/BatchForm';
import { Button } from '../components/UI/Button';
import { Modal } from '../components/UI/Modal';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;

export const ConcentrationManagementScreen: React.FC = () => {
    const { batches, createBatch, updateBatch, deleteBatch } = useConcentrationBatch();
    const [showForm, setShowForm] = useState(false);
    const [editingBatch, setEditingBatch] = useState<any>(null);

    const handleCreate = async (data: any) => {
        await createBatch(data);
        setShowForm(false);
    };

    const handleUpdate = async (id: string, data: any) => {
        await updateBatch(id, data);
        setEditingBatch(null);
        setShowForm(false);
    };

    const handleDelete = async (id: string) => {
        await deleteBatch(id);
    };

    const handleEdit = (batch: any) => {
        setEditingBatch(batch);
        setShowForm(true);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title} numberOfLines={1}>Batches</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowForm(true)}
                >
                    <Icon name="plus" size={18} color="#fff" />
                    <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
            </View>

            <BatchList
                batches={batches}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <Modal
                visible={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditingBatch(null);
                }}
            >
                <BatchForm
                    batch={editingBatch}
                    onSubmit={(data) => {
                        if (editingBatch) {
                            handleUpdate(editingBatch.id, data);
                        } else {
                            handleCreate(data);
                        }
                    }}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingBatch(null);
                    }}
                />
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isSmallScreen ? 12 : 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: {
        fontSize: isSmallScreen ? 18 : 22,
        fontWeight: '700',
        color: '#1f2937',
        flex: 1,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3b82f6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 4,
        fontSize: 14,
    },
});