import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';
import {
    ImageAnalysisData,
    HistogramData,
    HSVData,
    ExposureAnalysis,
    BlurAnalysis,
    BorderDetection,
    ShadowAnalysis,
    ReflectionAnalysis,
} from '@lateralflowscanner/shared';
import { QUALITY_THRESHOLDS } from '../constants';
import { obstructionDetectionService } from './obstructionDetection.service';

// Import analysis utilities
import { analyzeBlurWorklet } from '../utils/analysis/blur';
import { analyzeExposureWorklet } from '../utils/analysis/exposure';
import { analyzeBorderWorklet } from '../utils/analysis/border';
import { detectShadowsDetailedJS } from '../utils/analysis/shadow';
import { detectReflectionsDetailedJS } from '../utils/analysis/reflection';
import { calculateHistogramStatsWorklet, normalizeHistogramWorklet } from '../utils/camera/histogram';
import { assessImageQualityWorklet } from '../utils/image/quality';


const { OpenCVModule } = NativeModules;

class ImageProcessingService {
    async analyzeImage(imageUri: string): Promise<ImageAnalysisData> {
        try {
            // Read image data
            const imageData = await RNFS.readFile(imageUri, 'base64');

            // Perform all analyses in parallel
            const [
                histogram,
                // hsvData, // OpenCVModule doesn't calculate HSV explicitly yet, derived from histogram/native if needed
                exposureAnalysis,
                blurAnalysis,
                borderDetection,
                shadowAnalysis,
                // reflectionAnalysis, // Not yet implemented in OpenCVModule
            ] = await Promise.all([
                this.calculateHistogram(imageData),
                // this.calculateHSV(imageData),
                this.analyzeExposure(imageData),
                this.analyzeBlur(imageData),
                this.detectBordersFromImage(imageData),
                this.analyzeShadows(imageData),
                // this.analyzeReflections(imageData),
            ]);

            // Placeholder for missing native implementations
            const hsvData = await this.calculateHSV(imageData);
            const reflectionAnalysis = await this.analyzeReflections(imageData);


            // Calculate quality score
            const qualityScore = this.calculateQualityScore({
                blurAnalysis,
                exposureAnalysis,
                borderDetection,
                shadowAnalysis,
                reflectionAnalysis,
            });

            // Generate obstruction analysis
            const obstructionAnalysis = obstructionDetectionService.analyzeForObstruction({
                histogram,
                hsvData,
                exposureAnalysis,
                blurAnalysis,
                borderDetection,
                shadowAnalysis,
                reflectionAnalysis,
                // Partial ImageAnalysisData passed here is sufficient for obstruction detection
            } as any);

            // Generate warnings and recommendations
            const { warnings, recommendations } = this.generateFeedback({
                blurAnalysis,
                exposureAnalysis,
                borderDetection,
                shadowAnalysis,
                reflectionAnalysis,
                qualityScore,
                obstructionAnalysis,
            });

            return {
                histogram,
                hsvData,
                exposureAnalysis,
                blurAnalysis,
                borderDetection,
                shadowAnalysis,
                reflectionAnalysis,
                obstructionAnalysis,
                alignmentAnalysis: {
                    isAligned: false,
                    pitch: 0,
                    roll: 0,
                    yaw: 0,
                    levelness: 0,
                    recommendation: '',
                },
                qualityScore,
                warnings,
                recommendations,
            };
        } catch (error) {
            console.error('Image analysis error:', error);
            throw error;
        }
    }


    async calculateHistogram(imageData: string): Promise<HistogramData> {
        if (OpenCVModule && OpenCVModule.calculateHistogram) {
            return await OpenCVModule.calculateHistogram(imageData);
        }

        // Fallback implementation using JS utilities
        // Note: Full pixel iteration in JS is too slow for real-time base64 string,
        // so we return a neutral histogram but use our utility to ensure stats consistency.
        const neutralHistogram = new Array(256).fill(0);
        // Populate a simple bell curves or flat line for testing if needed, 
        // but for now keeping it safe with zeros or minimal values to avoid errors.

        const redStats = calculateHistogramStatsWorklet(neutralHistogram, 1);

        return {
            red: neutralHistogram,
            green: neutralHistogram,
            blue: neutralHistogram,
            brightness: neutralHistogram,
            contrast: 0,
            mean: redStats.mean, // Using shared utility
            std: redStats.std,   // Using shared utility
        };
    }

    async calculateHSV(imageData: string): Promise<HSVData> {
        // OpenCVModule doesn't currently export calculateHSV directly in the interface shown
        // We'll return a placeholder or implement it in native layer later
        return {
            hue: new Array(360).fill(0),
            saturation: new Array(100).fill(0),
            value: new Array(100).fill(0),
            meanHue: 0,
            meanSaturation: 0,
            meanValue: 0,
        };
    }

    async analyzeExposure(imageData: string): Promise<ExposureAnalysis> {
        // Use histogram data to analyze exposure if native method missing
        const histogram = await this.calculateHistogram(imageData);
        const mean = histogram.mean;
        const normalizedMean = mean / 255;

        const isUnderexposed = normalizedMean < QUALITY_THRESHOLDS.EXPOSURE.UNDEREXPOSED_THRESHOLD;
        const isOverexposed = normalizedMean > QUALITY_THRESHOLDS.EXPOSURE.OVEREXPOSED_THRESHOLD;

        let recommendation = '';
        if (isUnderexposed) {
            recommendation = 'Image is underexposed. Increase lighting or exposure.';
        } else if (isOverexposed) {
            recommendation = 'Image is overexposed. Decrease lighting or exposure.';
        } else {
            recommendation = 'Exposure is optimal.';
        }

        return {
            isUnderexposed,
            isOverexposed,
            exposureLevel: normalizedMean,
            dynamicRange: 0, // Not calculated currently
            clippedHighlights: 0,
            crushedShadows: 0,
            recommendation,
        };
    }

    async analyzeBlur(imageData: string): Promise<BlurAnalysis> {
        if (OpenCVModule && OpenCVModule.calculateLaplacianVariance) {
            const variance = await OpenCVModule.calculateLaplacianVariance(imageData);
            // Use utility for analysis
            return analyzeBlurWorklet(variance);
        }

        // Fallback using utility with default value
        return analyzeBlurWorklet(100);
    }

    async calculateLaplacianVariance(imageData: string): Promise<number> {
        if (OpenCVModule && OpenCVModule.calculateLaplacianVariance) {
            return await OpenCVModule.calculateLaplacianVariance(imageData);
        }
        return 1000; // Default fallback
    }

    async detectBordersFromImage(imageData: string): Promise<BorderDetection> {
        if (OpenCVModule && OpenCVModule.detectBorders) {
            const result = await OpenCVModule.detectBorders(imageData);

            // Map OpenCV result to BorderDetection type
            if (result.detected) {
                // Calculate derived metrics if not provided by native module
                const corners = result.corners || [];
                // Simple centered check
                const isCentered = true; // Placeholder logic
                const isAligned = true;
                const distanceFromCenter = 0;
                const aspectRatio = 0; // consistent with calculated

                return {
                    detected: true,
                    confidence: result.confidence || 0.9,
                    corners: corners,
                    area: result.area || 0,
                    aspectRatio,
                    isAligned,
                    isCentered,
                    distanceFromCenter,
                };
            }
        }

        // Fallback
        return {
            detected: false,
            confidence: 0,
            corners: [],
            area: 0,
            aspectRatio: 0,
            isAligned: false,
            isCentered: false,
            distanceFromCenter: 0,
        };
    }

    // Kept for signature compatibility, but unused if detectBordersFromImage is prioritized
    detectBorders(frame: any): Array<{ x: number; y: number }> {
        return [];
    }

    analyzeBorderDetection(corners: Array<{ x: number; y: number }>): BorderDetection {
        // Use utility for border analysis
        const analysis = analyzeBorderWorklet(corners, 640, 480);

        return {
            detected: analysis.detected,
            confidence: analysis.confidence,
            corners: analysis.corners,
            area: analysis.area,
            aspectRatio: analysis.aspectRatio,
            isAligned: analysis.isAligned,
            isCentered: analysis.isCentered,
            distanceFromCenter: 0,
        };
    }

    async analyzeShadows(imageData: string): Promise<ShadowAnalysis> {
        if (OpenCVModule && OpenCVModule.detectShadows) {
            const result = await OpenCVModule.detectShadows(imageData);
            return {
                hasShadow: result.hasShadow,
                shadowCoverage: result.shadowCoverage,
                shadowIntensity: result.shadowIntensity,
                shadowLocations: [], // Not returned by native module yet
            };
        }

        return {
            hasShadow: false,
            shadowCoverage: 0,
            shadowIntensity: 0,
            shadowLocations: [],
        };
    }

    async analyzeReflections(imageData: string): Promise<ReflectionAnalysis> {
        // Native module doesn't implement this yet
        return {
            hasReflection: false,
            reflectionIntensity: 0,
            glareDetected: false,
            affectedArea: 0,
        };
    }

    analyzeFrameQuality(frame: any): any {
        // Placeholder for real-time frame analysis via JSI/Frame Processor
        // Currently returning null as OpenCVModule is bridge-only
        return null;
    }

    calculateQualityScore(analyses: {
        blurAnalysis: BlurAnalysis;
        exposureAnalysis: ExposureAnalysis;
        borderDetection: BorderDetection;
        shadowAnalysis: ShadowAnalysis;
        reflectionAnalysis: ReflectionAnalysis;
    }): number {
        let score = 100;

        // Blur penalty
        if (analyses.blurAnalysis.isBlurry) {
            score -= 30;
        } else {
            score -= (1 - analyses.blurAnalysis.focusQuality) * 20;
        }

        // Exposure penalty
        if (analyses.exposureAnalysis.isUnderexposed || analyses.exposureAnalysis.isOverexposed) {
            score -= 25;
        }

        // Border detection penalty
        if (!analyses.borderDetection.detected) {
            score -= 20;
        }

        // Shadow penalty
        if (analyses.shadowAnalysis.hasShadow) {
            score -= analyses.shadowAnalysis.shadowCoverage * 15;
        }

        return Math.max(0, Math.min(100, score));
    }

    generateFeedback(data: {
        blurAnalysis: BlurAnalysis;
        exposureAnalysis: ExposureAnalysis;
        borderDetection: BorderDetection;
        shadowAnalysis: ShadowAnalysis;
        reflectionAnalysis: ReflectionAnalysis;
        qualityScore: number;
        obstructionAnalysis?: any;
    }): { warnings: string[]; recommendations: string[] } {
        const warnings: string[] = [];
        const recommendations: string[] = [];

        // Obstruction warnings
        if (data.obstructionAnalysis && data.obstructionAnalysis.hasObstruction) {
            warnings.push(data.obstructionAnalysis.recommendation || 'Lens obstructed');
            recommendations.push(data.obstructionAnalysis.recommendation || 'Remove obstruction');
        }

        // Blur warnings
        if (data.blurAnalysis.isBlurry) {
            warnings.push('Image is blurry');
            recommendations.push('Hold device steady or tap to focus');
        }

        // Exposure warnings
        if (data.exposureAnalysis.isUnderexposed) {
            warnings.push('Image is underexposed');
            recommendations.push('Move to better lighting or turn on flash');
        } else if (data.exposureAnalysis.isOverexposed) {
            warnings.push('Image is overexposed');
            recommendations.push('Reduce lighting or move to shaded area');
        }

        // Border detection warnings
        if (!data.borderDetection.detected) {
            warnings.push('Cassette not detected');
            recommendations.push('Position cassette within the guide frame');
        }

        // Shadow warnings
        if (data.shadowAnalysis.hasShadow) {
            warnings.push('Shadow detected on cassette');
            recommendations.push('Adjust position to remove shadows');
        }

        // Overall quality
        if (data.qualityScore < 50) {
            warnings.push('Image quality is poor');
            recommendations.push('Follow all recommendations for better quality');
        }

        return { warnings, recommendations };
    }
}

export const imageProcessingService = new ImageProcessingService();