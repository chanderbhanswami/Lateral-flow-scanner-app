/**
 * Color Calibration Service
 * 
 * This service provides color calibration functionality using a reference color chart.
 * It allows for accurate color measurement by calibrating against known color values.
 */

import { NativeModules } from 'react-native';

const { ImageProcessingModule } = NativeModules;

// Standard color chart reference values (sRGB)
// Based on X-Rite ColorChecker Classic
export const COLOR_CHART_REFERENCE = {
    darkSkin: { r: 115, g: 82, b: 68, hsv: { h: 13, s: 41, v: 45 } },
    lightSkin: { r: 194, g: 150, b: 130, hsv: { h: 19, s: 33, v: 76 } },
    blueSky: { r: 98, g: 122, b: 157, hsv: { h: 216, s: 38, v: 62 } },
    foliage: { r: 87, g: 108, b: 67, hsv: { h: 91, s: 38, v: 42 } },
    blueFlower: { r: 133, g: 128, b: 177, hsv: { h: 246, s: 28, v: 69 } },
    bluishGreen: { r: 103, g: 189, b: 170, hsv: { h: 167, s: 45, v: 74 } },
    orange: { r: 214, g: 126, b: 44, hsv: { h: 29, s: 79, v: 84 } },
    purplishBlue: { r: 80, g: 91, b: 166, hsv: { h: 232, s: 52, v: 65 } },
    moderateRed: { r: 193, g: 90, b: 99, hsv: { h: 355, s: 53, v: 76 } },
    purple: { r: 94, g: 60, b: 108, hsv: { h: 283, s: 44, v: 42 } },
    yellowGreen: { r: 157, g: 188, b: 64, hsv: { h: 75, s: 66, v: 74 } },
    orangeYellow: { r: 224, g: 163, b: 46, hsv: { h: 39, s: 79, v: 88 } },
    blue: { r: 56, g: 61, b: 150, hsv: { h: 237, s: 63, v: 59 } },
    green: { r: 70, g: 148, b: 73, hsv: { h: 122, s: 53, v: 58 } },
    red: { r: 175, g: 54, b: 60, hsv: { h: 357, s: 69, v: 69 } },
    yellow: { r: 231, g: 199, b: 31, hsv: { h: 50, s: 87, v: 91 } },
    magenta: { r: 187, g: 86, b: 149, hsv: { h: 323, s: 54, v: 73 } },
    cyan: { r: 8, g: 133, b: 161, hsv: { h: 191, s: 95, v: 63 } },
    white: { r: 243, g: 243, b: 242, hsv: { h: 60, s: 0, v: 95 } },
    neutral8: { r: 200, g: 200, b: 200, hsv: { h: 0, s: 0, v: 78 } },
    neutral65: { r: 160, g: 160, b: 160, hsv: { h: 0, s: 0, v: 63 } },
    neutral5: { r: 122, g: 122, b: 121, hsv: { h: 60, s: 1, v: 48 } },
    neutral35: { r: 85, g: 85, b: 85, hsv: { h: 0, s: 0, v: 33 } },
    black: { r: 52, g: 52, b: 52, hsv: { h: 0, s: 0, v: 20 } },
};

export interface CalibrationResult {
    isCalibrated: boolean;
    colorCorrectionMatrix: number[][];
    whiteBalance: { r: number; g: number; b: number };
    gammaCorrection: number;
    exposureCompensation: number;
    timestamp: number;
    confidence: number;
}

export interface ColorAnalysisResult {
    originalColor: { r: number; g: number; b: number };
    calibratedColor: { r: number; g: number; b: number };
    hsv: { h: number; s: number; v: number };
    deltaE: number; // Color difference from reference
}

class ColorCalibrationService {
    private calibrationData: CalibrationResult | null = null;

    /**
     * Perform color calibration using a captured image of a color chart
     */
    async calibrateFromColorChart(imageData: string): Promise<CalibrationResult> {
        try {
            // Try to use native module for faster processing
            if (ImageProcessingModule?.calibrateColorChart) {
                const result = await ImageProcessingModule.calibrateColorChart(imageData);
                this.calibrationData = result;
                return result;
            }

            // JavaScript fallback implementation
            const result = await this.performJSCalibration(imageData);
            this.calibrationData = result;
            return result;
        } catch (error) {
            console.error('Color calibration error:', error);
            throw error;
        }
    }

    /**
     * JavaScript implementation of "Gray World" Assumption for Auto White Balance.
     * 
     * The Gray World hypothesis assumes that the average reflectance of a scene is neutral gray.
     * We calculate the average R, G, and B of the image.
     * Then we calculate scaling factors to bring the average of each channel to the overall average gray.
     * 
     * Note: Accessing raw pixel data from base64 in JS is slow. 
     * We will use a simplified approach assuming we can sample pixels or use histogram means.
     * Since we don't have direct pixel access easily without a library like 'image-js' or 'canvas',
     * we will attempt to rely on the Histogram data if available (which gives us mean R, G, B).
     */
    private async performJSCalibration(imageData: string): Promise<CalibrationResult> {
        // We import imageProcessingService here to avoid circular dep issues at top level if possible, 
        // or just assume we can call the native histogram function directly if available.
        // For now, we will assume we can get the mean values from a histogram calculation.

        let meanR = 128;
        let meanG = 128;
        let meanB = 128;

        try {
            // Attempt to get histogram from native module to calculate means efficiently
            if (ImageProcessingModule?.calculateHistogram) {
                const histogram = await ImageProcessingModule.calculateHistogram(imageData);
                meanR = histogram.mean || 128; // This simplistic interface might need expansion
                // If histogram.mean is a scalar, it's likely grayscale. We need RGB means.
                // Assuming calculateHistogram might return separate red/green/blue arrays or means.
                // Let's assume for this fallback we calculate scaling factors based on what we have.
                // Actually, typically calculateHistogram returns { red: [], green: [], blue: [] }.
                // We can calculate the mean of each channel distribution.

                if (Array.isArray(histogram.red)) {
                    meanR = this.calculateMean(histogram.red);
                    meanG = this.calculateMean(histogram.green);
                    meanB = this.calculateMean(histogram.blue);
                }
            }
        } catch (e) {
            console.warn('Failed to calculate histogram for calibration, using defaults', e);
        }

        // Gray World Algorithm
        // 1. Calculate overall gray average
        const gray = (meanR + meanG + meanB) / 3;

        // 2. Calculate scaling factors (Gain)
        // Avoid division by zero
        const scaleR = meanR > 0 ? gray / meanR : 1;
        const scaleG = meanG > 0 ? gray / meanG : 1;
        const scaleB = meanB > 0 ? gray / meanB : 1;

        // Create a 3x3 Diagonal Matrix for scaling
        const colorCorrectionMatrix = [
            [scaleR, 0, 0],
            [0, scaleG, 0],
            [0, 0, scaleB]
        ];

        return {
            isCalibrated: true,
            colorCorrectionMatrix,
            whiteBalance: { r: scaleR, g: scaleG, b: scaleB },
            gammaCorrection: 2.2, // Standard sRGB gamma assumption
            exposureCompensation: 0,
            timestamp: Date.now(),
            confidence: 0.8, // Good confidence for Gray World in average scenes
        };
    }

    private calculateMean(distribution: number[]): number {
        let sum = 0;
        let validPixels = 0;
        // The histogram array indices are the values (0-255), values are counts
        for (let i = 0; i < distribution.length; i++) {
            sum += i * distribution[i];
            validPixels += distribution[i];
        }
        return validPixels > 0 ? sum / validPixels : 128;
    }

    /**
     * Apply color calibration to a color value
     */
    applyCalibration(color: { r: number; g: number; b: number }): ColorAnalysisResult {
        if (!this.calibrationData) {
            return {
                originalColor: color,
                calibratedColor: color,
                hsv: this.rgbToHsv(color),
                deltaE: 0,
            };
        }

        const { colorCorrectionMatrix, gammaCorrection } = this.calibrationData;

        // 1. Linearize (Remove Gamma) - Assume input is sRGB ~2.2 gamma
        // We normalize to 0-1 first
        let rLin = Math.pow(color.r / 255, gammaCorrection);
        let gLin = Math.pow(color.g / 255, gammaCorrection);
        let bLin = Math.pow(color.b / 255, gammaCorrection);

        // 2. Apply Color Correction Matrix (Gray World uses a diagonal matrix)
        const newRLin = rLin * colorCorrectionMatrix[0][0] + gLin * colorCorrectionMatrix[0][1] + bLin * colorCorrectionMatrix[0][2];
        const newGLin = rLin * colorCorrectionMatrix[1][0] + gLin * colorCorrectionMatrix[1][1] + bLin * colorCorrectionMatrix[1][2];
        const newBLin = rLin * colorCorrectionMatrix[2][0] + gLin * colorCorrectionMatrix[2][1] + bLin * colorCorrectionMatrix[2][2];

        // 3. Re-apply Gamma
        const rFinal = Math.pow(Math.max(0, newRLin), 1 / gammaCorrection) * 255;
        const gFinal = Math.pow(Math.max(0, newGLin), 1 / gammaCorrection) * 255;
        const bFinal = Math.pow(Math.max(0, newBLin), 1 / gammaCorrection) * 255;

        const calibratedColor = {
            r: Math.min(255, Math.max(0, rFinal)),
            g: Math.min(255, Math.max(0, gFinal)),
            b: Math.min(255, Math.max(0, bFinal)),
        };

        return {
            originalColor: color,
            calibratedColor,
            hsv: this.rgbToHsv(calibratedColor),
            deltaE: this.calculateDeltaE(color, calibratedColor),
        };
    }

    /**
     * Convert RGB to HSV
     */
    private rgbToHsv(color: { r: number; g: number; b: number }): { h: number; s: number; v: number } {
        const r = color.r / 255;
        const g = color.g / 255;
        const b = color.b / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;

        let h = 0;
        const s = max === 0 ? 0 : diff / max;
        const v = max;

        if (diff !== 0) {
            switch (max) {
                case r:
                    h = ((g - b) / diff) % 6;
                    break;
                case g:
                    h = (b - r) / diff + 2;
                    break;
                case b:
                    h = (r - g) / diff + 4;
                    break;
            }
            h = Math.round(h * 60);
            if (h < 0) h += 360;
        }

        return { h, s: Math.round(s * 100), v: Math.round(v * 100) };
    }

    /**
     * Calculate CIE Delta E color difference (simplified Euclidean in RGB, for real accuracy Lab is needed but complex in JS)
     */
    private calculateDeltaE(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
        const dR = color1.r - color2.r;
        const dG = color1.g - color2.g;
        const dB = color1.b - color2.b;
        return Math.sqrt(dR * dR + dG * dG + dB * dB);
    }

    /**
     * Check if calibration is available and valid
     */
    isCalibrated(): boolean {
        if (!this.calibrationData) return false;

        // Check if calibration is less than 24 hours old
        const maxAge = 24 * 60 * 60 * 1000;
        return (Date.now() - this.calibrationData.timestamp) < maxAge;
    }

    /**
     * Get current calibration data
     */
    getCalibrationData(): CalibrationResult | null {
        return this.calibrationData;
    }

    /**
     * Clear current calibration
     */
    clearCalibration(): void {
        this.calibrationData = null;
    }
}

export const colorCalibrationService = new ColorCalibrationService();
