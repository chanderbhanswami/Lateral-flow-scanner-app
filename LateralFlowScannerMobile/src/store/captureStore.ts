import { create } from 'zustand';
import { CaptureData, ImageAnalysisData } from '../types';

interface CaptureState {
    currentCapture: CaptureData | null;
    analysis: ImageAnalysisData | null;
    isCapturing: boolean;
    isProcessing: boolean;
    isUploading: boolean;
    captureMode: 'auto' | 'manual';
    stableFrameCount: number;
    setCurrentCapture: (capture: CaptureData | null) => void;
    setAnalysis: (analysis: ImageAnalysisData | null) => void;
    setIsCapturing: (isCapturing: boolean) => void;
    setIsProcessing: (isProcessing: boolean) => void;
    setIsUploading: (isUploading: boolean) => void;
    setCaptureMode: (mode: 'auto' | 'manual') => void;
    incrementStableFrameCount: () => void;
    resetStableFrameCount: () => void;
    reset: () => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
    currentCapture: null,
    analysis: null,
    isCapturing: false,
    isProcessing: false,
    isUploading: false,
    captureMode: 'auto',
    stableFrameCount: 0,

    setCurrentCapture: (capture) => set({ currentCapture: capture }),
    setAnalysis: (analysis) => set({ analysis }),
    setIsCapturing: (isCapturing) => set({ isCapturing }),
    setIsProcessing: (isProcessing) => set({ isProcessing }),
    setIsUploading: (isUploading) => set({ isUploading }),
    setCaptureMode: (mode) => set({ captureMode: mode }),
    incrementStableFrameCount: () => set((state) => ({ stableFrameCount: state.stableFrameCount + 1 })),
    resetStableFrameCount: () => set({ stableFrameCount: 0 }),

    reset: () => set({
        currentCapture: null,
        analysis: null,
        isCapturing: false,
        isProcessing: false,
        isUploading: false,
        stableFrameCount: 0,
    }),
}));