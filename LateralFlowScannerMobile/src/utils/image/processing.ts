import { NativeModules } from 'react-native';

const { ImageProcessingModule } = NativeModules;

export const imageProcessing = {
    /**
     * Calculate Laplacian variance for blur detection
     */
    async calculateLaplacianVariance(imageBase64: string): Promise<number> {
        if (ImageProcessingModule?.calculateLaplacianVariance) {
            return await ImageProcessingModule.calculateLaplacianVariance(imageBase64);
        }
        return 1000; // Default fallback
    },

    /**
     * Detect edges in image
     */
    async detectEdges(imageBase64: string, threshold1: number = 50, threshold2: number = 150): Promise<string> {
        if (ImageProcessingModule?.detectEdges) {
            return await ImageProcessingModule.detectEdges(imageBase64, threshold1, threshold2);
        }
        return imageBase64;
    },

    /**
     * Adjust brightness and contrast
     */
    async adjustBrightnessContrast(
        imageBase64: string,
        brightness: number = 0,
        contrast: number = 1.0
    ): Promise<string> {
        if (ImageProcessingModule?.adjustBrightnessContrast) {
            return await ImageProcessingModule.adjustBrightnessContrast(imageBase64, brightness, contrast);
        }
        return imageBase64;
    },

    /**
     * Apply Gaussian blur
     */
    async applyGaussianBlur(imageBase64: string, kernelSize: number = 5): Promise<string> {
        if (ImageProcessingModule?.applyGaussianBlur) {
            return await ImageProcessingModule.applyGaussianBlur(imageBase64, kernelSize);
        }
        return imageBase64;
    },

    /**
     * Sharpen image
     */
    async sharpenImage(imageBase64: string, amount: number = 1.0): Promise<string> {
        if (ImageProcessingModule?.sharpenImage) {
            return await ImageProcessingModule.sharpenImage(imageBase64, amount);
        }
        return imageBase64;
    },
};