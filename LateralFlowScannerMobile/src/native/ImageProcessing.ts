import { NativeModules } from 'react-native';

const { ImageProcessingModule } = NativeModules;

export interface ImageProcessingNative {
    calculateLaplacianVariance(imageBase64: string): Promise<number>;
    detectBordersFromImage(imageBase64: string): Promise<any>;
    calculateHistogram(imageBase64: string): Promise<any>;
    calculateHSV(imageBase64: string): Promise<any>;
    analyzeExposure(imageBase64: string): Promise<any>;
    analyzeBlur(imageBase64: string): Promise<any>;
    analyzeShadows(imageBase64: string): Promise<any>;
    analyzeReflections(imageBase64: string): Promise<any>;
}

export const ImageProcessing: ImageProcessingNative = {
    calculateLaplacianVariance: async (imageBase64: string) => {
        if (ImageProcessingModule?.calculateLaplacianVariance) {
            return await ImageProcessingModule.calculateLaplacianVariance(imageBase64);
        }
        return 1000;
    },

    detectBordersFromImage: async (imageBase64: string) => {
        if (ImageProcessingModule?.detectBordersFromImage) {
            return await ImageProcessingModule.detectBordersFromImage(imageBase64);
        }
        return { detected: false, confidence: 0 };
    },

    calculateHistogram: async (imageBase64: string) => {
        if (ImageProcessingModule?.calculateHistogram) {
            return await ImageProcessingModule.calculateHistogram(imageBase64);
        }
        return {};
    },

    calculateHSV: async (imageBase64: string) => {
        if (ImageProcessingModule?.calculateHSV) {
            return await ImageProcessingModule.calculateHSV(imageBase64);
        }
        return {};
    },

    analyzeExposure: async (imageBase64: string) => {
        if (ImageProcessingModule?.analyzeExposure) {
            return await ImageProcessingModule.analyzeExposure(imageBase64);
        }
        return {};
    },

    analyzeBlur: async (imageBase64: string) => {
        if (ImageProcessingModule?.analyzeBlur) {
            return await ImageProcessingModule.analyzeBlur(imageBase64);
        }
        return {};
    },

    analyzeShadows: async (imageBase64: string) => {
        if (ImageProcessingModule?.analyzeShadows) {
            return await ImageProcessingModule.analyzeShadows(imageBase64);
        }
        return {};
    },

    analyzeReflections: async (imageBase64: string) => {
        if (ImageProcessingModule?.analyzeReflections) {
            return await ImageProcessingModule.analyzeReflections(imageBase64);
        }
        return {};
    },
};