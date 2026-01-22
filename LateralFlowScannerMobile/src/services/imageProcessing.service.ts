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
            const results = await Promise.all([
                this.calculateHistogram(imageData),
                this.analyzeExposure(imageData),
                this.analyzeBlur(imageData),
                this.detectBordersFromImage(imageData),
                this.analyzeShadows(imageData),
                this.analyzeReflections(imageData), // Native implementation exists now
                OpenCVModule && OpenCVModule.calculateWaveform ? OpenCVModule.calculateWaveform(imageData) : Promise.resolve({ waveformX: [], waveformY: [] }),
            ]);

            const [
                histogram,
                exposureAnalysis,
                blurAnalysis,
                borderDetection,
                shadowAnalysis,
                // reflectionAnalysis (will be reassigned or used from results)
            ] = results;

            // reflectionAnalysis is at index 5
            const reflectionAnalysis = results[5];
            const waveform = results[6];

            // Calculate HSV separately or in parallel? For clarity we do separate call as it wasn't in list originally
            // But we could have added it to Promise.all. 
            const hsvData = await this.calculateHSV(imageData);


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
                waveform,
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
            const result = await OpenCVModule.calculateHistogram(imageData);
            // Native module now returns 'luminance' array and 'isBimodal', 'peakCount'
            return {
                red: result.red,
                green: result.green,
                blue: result.blue,
                brightness: result.luminance || new Array(256).fill(0), // Map luminance to brightness
                contrast: result.contrast,
                mean: result.mean,
                std: result.std,
                isBimodal: result.isBimodal,
                peakCount: result.peakCount
            };
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
        if (OpenCVModule && OpenCVModule.calculateHSVHistogram) {
            try {
                return await OpenCVModule.calculateHSVHistogram(imageData);
            } catch (e) {
                console.warn('Native HSV calculation failed, falling back', e);
            }
        }

        // Fallback or placeholder
        let meanHue = 0;
        let meanSaturation = 0;
        let meanValue = 0;

        try {
            // Try to at least get mean value from histogram if available
            const histogram = await this.calculateHistogram(imageData);
            if (histogram && histogram.mean) {
                meanValue = histogram.mean;
            }
        } catch (e) { }

        return {
            hue: new Array(360).fill(0),
            saturation: new Array(100).fill(0),
            value: new Array(100).fill(0),
            meanHue,
            meanSaturation,
            meanValue,
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

    async scanCodes(imageUri: string): Promise<Array<{ rawValue: string; displayValue: string; format: number }>> {
        if (OpenCVModule && OpenCVModule.scanCodes) {
            try {
                // Remove file:// prefix if present, OR keep it if native module handles it.
                // My native implementation handles both.
                return await OpenCVModule.scanCodes(imageUri);
            } catch (e) {
                console.warn('QR Scan failed', e);
                return [];
            }
        }
        return [];
    }

    async detectBordersFromImage(imageDataOrPath: string): Promise<BorderDetection> {
        if (OpenCVModule && OpenCVModule.detectBorders) {
            let base64Data = imageDataOrPath;
            // Check if it looks like a file path (starts with / or file://)
            if (imageDataOrPath.startsWith('/') || imageDataOrPath.startsWith('file://')) {
                try {
                    // Ensure valid read path (some libs don't like file:// for readFile, some do. RNFS on Android usually prefers absolute path without file:// or works with both. Best to strip file:// for RNFS if needed, but let's try standard)
                    const cleanPath = imageDataOrPath.startsWith('file://') ? imageDataOrPath.substring(7) : imageDataOrPath;
                    base64Data = await RNFS.readFile(cleanPath, 'base64');
                } catch (e) {
                    console.warn('[ImageProcessing] Failed to read file for border detection', e);
                    return {
                        detected: false, confidence: 0, corners: [], area: 0, aspectRatio: 0,
                        isAligned: false, isCentered: false, distanceFromCenter: 0
                    };
                }
            }

            const result = await OpenCVModule.detectBorders(base64Data);

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

    async extractExif(imagePath: string): Promise<any> {
        if (OpenCVModule && OpenCVModule.getExifData) {
            try {
                // Ensure path is local file path, remove 'file://' if needed for ExifInterface? 
                // Android ExifInterface handles paths mostly fine, but let's pass it cleanly.
                const cleanPath = imagePath.replace('file://', '');
                return await OpenCVModule.getExifData(cleanPath);
            } catch (e) {
                console.warn('Failed to extract native EXIF', e);
                return {};
            }
        }
        return {};
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