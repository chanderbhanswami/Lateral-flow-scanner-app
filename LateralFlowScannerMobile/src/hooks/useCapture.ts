import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CaptureData } from '@lateralflowscanner/shared';
import { captureService } from '../services/capture.service';
import { uploadService } from '../services/upload.service';

export const useCapture = () => {
    const [captureData, setCaptureData] = useState<CaptureData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const uploadMutation = useMutation({
        mutationFn: async (data: { captureData: CaptureData; imageUri: string }) => {
            return await uploadService.uploadCapture(data.captureData, data.imageUri);
        },
        onSuccess: () => {
            console.log('Upload successful');
        },
        onError: (error) => {
            console.error('Upload failed:', error);
        },
    });

    const processCapture = useCallback(async (
        imageUri: string,
        metadata: any,
        sensorData: any,
        analysis: any
    ) => {
        setIsProcessing(true);
        try {
            // 1. Perform Crop
            const corners = analysis.borderCorners || null;
            const croppedUri = await captureService.cropCapture(
                imageUri,
                corners,
                metadata.width,
                metadata.height
            );

            // 2. Create Data with Cropped Image
            const capture = await captureService.createCaptureData(
                croppedUri,
                metadata,
                sensorData,
                analysis
            );
            setCaptureData(capture);
            return capture;
        } catch (error) {
            console.error('Process capture error:', error);
            throw error;
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const uploadCapture = useCallback(async (
        captureData: CaptureData,
        imageUri: string
    ) => {
        await uploadMutation.mutateAsync({ captureData, imageUri });
    }, [uploadMutation]);

    const resetCapture = useCallback(() => {
        setCaptureData(null);
    }, []);

    return {
        captureData,
        isProcessing,
        isUploading: uploadMutation.isPending,
        processCapture,
        uploadCapture,
        resetCapture,
    };
};