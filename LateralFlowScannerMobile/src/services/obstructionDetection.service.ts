import { ImageAnalysisData, HistogramData, ObstructionAnalysis } from '../types';

class ObstructionDetectionService {
    /**
     * Analyze frame for camera obstructions using processed image data
     */
    analyzeForObstruction(analysisData: ImageAnalysisData): ObstructionAnalysis {
        try {
            return this.performAnalysis(analysisData);
        } catch (error) {
            console.error('Obstruction detection error:', error);
            return this.getDefaultAnalysis();
        }
    }

    /**
     * Analysis based on real telemetry
     */
    private performAnalysis(data: ImageAnalysisData): ObstructionAnalysis {
        // Calculate detection metrics from real data
        const brightnessAnomalies = this.detectBrightnessAnomalies(data.histogram);
        const histogramSkew = this.calculateHistogramSkew(data.histogram);

        // Shadow analysis is a strong indicator of obstruction (finger casting shadow)
        const shadowCoverage = data.shadowAnalysis.hasShadow ? data.shadowAnalysis.shadowCoverage : 0;

        // If border detection fails completely, it might be an obstruction
        const edgeLoss = !data.borderDetection.detected ? 1 : 0;

        // Determine obstruction type and confidence
        const { hasObstruction, obstructionType, coverage, confidence } =
            this.determineObstruction({
                edgeLoss,
                shadowCoverage,
                brightnessAnomalies,
                histogramSkew,
            });

        return {
            hasObstruction,
            obstructionType,
            coverage,
            confidence,
            details: {
                edgeLoss,
                patternLoss: shadowCoverage, // Using shadow as proxy for pattern loss/foreign object
                brightnessAnomalies,
                histogramSkew,
                colorAnomalies: 0, // Not calculated currently
            },
            recommendation: this.getRecommendation(obstructionType, coverage),
        };
    }

    /**
     * Detect abnormal brightness levels
     */
    private detectBrightnessAnomalies(histogram: HistogramData): number {
        const mean = histogram.mean;

        // Finger typically causes very dark image (when covering lens)
        if (mean < 30) {
            return Math.min(1, (30 - mean) / 30);
        }

        // Very bright could indicate glare or reflection
        if (mean > 240) {
            return Math.min(1, (mean - 240) / 15);
        }

        return 0;
    }

    /**
     * Calculate histogram skew
     */
    private calculateHistogramSkew(histogram: HistogramData): number {
        const mean = histogram.mean;

        // Heavy skew towards dark values indicates obstruction
        if (mean < 50) {
            return Math.min(1, (50 - mean) / 50);
        }

        return 0;
    }

    /**
     * Determine the type of obstruction based on all metrics
     */
    private determineObstruction(details: {
        edgeLoss: number;
        shadowCoverage: number;
        brightnessAnomalies: number;
        histogramSkew: number;
    }): {
        hasObstruction: boolean;
        obstructionType: 'finger' | 'object' | 'partial' | 'none';
        coverage: number;
        confidence: number;
    } {
        const {
            edgeLoss,
            shadowCoverage,
            brightnessAnomalies,
            histogramSkew,
        } = details;

        // Calculate overall obstruction score
        // High brightness anomaly (dark) + high skew = likely finger
        // High shadow coverage = likely object/finger

        let score = 0;
        let obstructionType: 'finger' | 'object' | 'partial' | 'none' = 'none';

        if (brightnessAnomalies > 0.8 && histogramSkew > 0.8) {
            score = 0.9;
            obstructionType = 'finger';
        } else if (shadowCoverage > 0.4) {
            score = shadowCoverage;
            obstructionType = 'partial';
        } else if (edgeLoss > 0.9 && brightnessAnomalies > 0.5) {
            score = 0.6;
            obstructionType = 'object';
        }

        const hasObstruction = score > 0.3;
        const coverage = Math.round(score * 100);
        const confidence = hasObstruction ? 0.8 : 0.9;

        return { hasObstruction, obstructionType, coverage, confidence };
    }

    /**
     * Generate recommendation based on obstruction type
     */
    private getRecommendation(type: 'finger' | 'object' | 'partial' | 'none', coverage: number): string {
        switch (type) {
            case 'finger':
                return 'Remove your finger from the camera lens';
            case 'partial':
                return `Camera is ${coverage}% obstructed. Check for objects near the lens`;
            case 'object':
                return 'Camera lens is blocked. Remove the obstruction';
            case 'none':
                return '';
        }
    }

    /**
     * Get default analysis when detection fails
     */
    private getDefaultAnalysis(): ObstructionAnalysis {
        return {
            hasObstruction: false,
            obstructionType: 'none',
            coverage: 0,
            confidence: 0,
            details: {
                edgeLoss: 0,
                patternLoss: 0,
                brightnessAnomalies: 0,
                histogramSkew: 0,
                colorAnomalies: 0,
            },
            recommendation: '',
        };
    }

    /**
     * Detect if cassette is visible in frame
     */
    // Kept for backward compatibility if needed, but relies on imageProcessingService
    async detectCassettePresence(frameData: string): Promise<{
        isVisible: boolean;
        confidence: number;
        position: { x: number; y: number; width: number; height: number } | null;
        recommendation: string;
    }> {
        // Logic should move to imageProcessingService or use its output
        return {
            isVisible: true,
            confidence: 0,
            position: null,
            recommendation: '',
        };
    }
}

export const obstructionDetectionService = new ObstructionDetectionService();
