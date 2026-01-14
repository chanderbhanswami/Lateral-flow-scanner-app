import { useState, useCallback } from 'react';
import { ImageAnalysisData } from '../types';
import { imageProcessingService } from '../services/imageProcessing.service';

export const useImageAnalysis = () => {
    const [analysis, setAnalysis] = useState<ImageAnalysisData | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const analyzeImage = useCallback(async (imageUri: string) => {
        setIsAnalyzing(true);
        try {
            const result = await imageProcessingService.analyzeImage(imageUri);
            setAnalysis(result);
            return result;
        } catch (error) {
            console.error('Image analysis error:', error);
            throw error;
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    const resetAnalysis = useCallback(() => {
        setAnalysis(null);
    }, []);

    return {
        analysis,
        isAnalyzing,
        analyzeImage,
        resetAnalysis,
    };
};