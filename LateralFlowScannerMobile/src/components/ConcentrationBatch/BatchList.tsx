import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ConcentrationBatch } from '../../types';
import { BatchItem } from './BatchItem';

interface BatchListProps {
    batches: ConcentrationBatch[];
    onEdit: (batch: ConcentrationBatch) => void;
    onDelete: (id: string) => void;
}

export const BatchList: React.FC<BatchListProps> = ({ batches, onEdit, onDelete }) => {
    return (
        <FlatList
            data={batches}
            renderItem={({ item }) => (
                <BatchItem
                    batch={item}
                    onEdit={() => onEdit(item)}
                    onDelete={() => onDelete(item.id)}
                />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
        />
    );
};

const styles = StyleSheet.create({
    list: {
        padding: 16,
    },
});
