import { create } from 'zustand';
import { ConcentrationBatch } from '../types';

interface ConcentrationState {
    batches: ConcentrationBatch[];
    selectedBatch: ConcentrationBatch | null;
    setBatches: (batches: ConcentrationBatch[]) => void;
    setSelectedBatch: (batch: ConcentrationBatch | null) => void;
    addBatch: (batch: ConcentrationBatch) => void;
    updateBatch: (id: string, data: Partial<ConcentrationBatch>) => void;
    removeBatch: (id: string) => void;
}

export const useConcentrationStore = create<ConcentrationState>((set) => ({
    batches: [],
    selectedBatch: null,

    setBatches: (batches) => set({ batches }),

    setSelectedBatch: (batch) => set({ selectedBatch: batch }),

    addBatch: (batch) => set((state) => ({ batches: [...state.batches, batch] })),

    updateBatch: (id, data) => set((state) => ({
        batches: state.batches.map((b) => (b.id === id ? { ...b, ...data } : b)),
    })),

    removeBatch: (id) => set((state) => ({
        batches: state.batches.filter((b) => b.id !== id),
        selectedBatch: state.selectedBatch?.id === id ? null : state.selectedBatch,
    })),
}));