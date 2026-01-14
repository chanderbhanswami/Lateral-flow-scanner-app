import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConcentrationBatch } from '../types';
import { concentrationApi } from '../api/concentration.api';
import { useConcentrationStore } from '../store/concentrationStore';

export const useConcentrationBatch = () => {
    const queryClient = useQueryClient();
    const { selectedBatch, setSelectedBatch } = useConcentrationStore();

    const { data: batches, isLoading } = useQuery({
        queryKey: ['concentrationBatches'],
        queryFn: concentrationApi.list,
    });

    const createMutation = useMutation({
        mutationFn: concentrationApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['concentrationBatches'] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ConcentrationBatch> }) =>
            concentrationApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['concentrationBatches'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: concentrationApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['concentrationBatches'] });
        },
    });

    const createBatch = useCallback(async (data: Omit<ConcentrationBatch, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
        return await createMutation.mutateAsync(data);
    }, [createMutation]);

    const updateBatch = useCallback(async (id: string, data: Partial<ConcentrationBatch>) => {
        return await updateMutation.mutateAsync({ id, data });
    }, [updateMutation]);

    const deleteBatch = useCallback(async (id: string) => {
        return await deleteMutation.mutateAsync(id);
    }, [deleteMutation]);

    const selectBatch = useCallback((batch: ConcentrationBatch | null) => {
        setSelectedBatch(batch);
    }, [setSelectedBatch]);

    return {
        batches: batches || [],
        selectedBatch,
        isLoading,
        createBatch,
        updateBatch,
        deleteBatch,
        selectBatch,
    };
};