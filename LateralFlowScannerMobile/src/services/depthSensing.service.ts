/**
 * Depth Sensing Service
 * 
 * Provides depth/distance estimation using LiDAR, ToF sensors,
 * or camera focus feedback as fallback.
 */

import { NativeModules, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

const { DepthSensorModule, CameraMetadataModule } = NativeModules;

export interface DepthInfo {
    hasDepthSensor: boolean;
    sensorType: 'lidar' | 'tof' | 'focus' | 'none';
    distanceMM: number | null;
    distanceCM: number | null;
    confidence: number;
    isOptimalDistance: boolean;
    recommendation: string;
    rawData?: {
        focusDistance?: number;
        depthMap?: number[][];
        centerDepth?: number;
    };
}

export interface DepthSensorCapabilities {
    hasLiDAR: boolean;
    hasToF: boolean;
    hasDualCamera: boolean;
    hasAutofocusDistance: boolean;
    maxDepthRange?: number;
    minDepthRange?: number;
}

// Optimal distance range for lateral flow test capture (in mm)
const OPTIMAL_DISTANCE = {
    MIN: 100,  // 10 cm
    MAX: 300,  // 30 cm
    IDEAL: 150, // 15 cm
};

class DepthSensingService {
    private capabilities: DepthSensorCapabilities | null = null;
    private lastDepthReading: DepthInfo | null = null;
    private isInitialized = false;

    /**
     * Initialize the depth sensing service
     */
    async initialize(): Promise<DepthSensorCapabilities> {
        if (this.isInitialized && this.capabilities) {
            return this.capabilities;
        }

        try {
            // Check device capabilities
            this.capabilities = await this.detectCapabilities();
            this.isInitialized = true;
            return this.capabilities;
        } catch (error) {
            console.error('Depth sensor initialization error:', error);
            this.capabilities = {
                hasLiDAR: false,
                hasToF: false,
                hasDualCamera: false,
                hasAutofocusDistance: true, // Most devices have this
            };
            return this.capabilities;
        }
    }

    /**
     * Detect available depth sensing capabilities
     */
    private async detectCapabilities(): Promise<DepthSensorCapabilities> {
        const deviceModel = await DeviceInfo.getModel();
        const isIOS = Platform.OS === 'ios';
        const isAndroid = Platform.OS === 'android';

        // LiDAR is available on iPhone 12 Pro and later Pro models, iPad Pro 2020+
        const lidarModels = [
            'iPhone 12 Pro', 'iPhone 12 Pro Max',
            'iPhone 13 Pro', 'iPhone 13 Pro Max',
            'iPhone 14 Pro', 'iPhone 14 Pro Max',
            'iPhone 15 Pro', 'iPhone 15 Pro Max',
            'iPhone 16 Pro', 'iPhone 16 Pro Max',
            'iPad Pro',
        ];
        const hasLiDAR = isIOS && lidarModels.some(m => deviceModel.includes(m));

        // ToF sensors are common on flagship Android devices
        const tofModels = [
            'Galaxy S20', 'Galaxy S21', 'Galaxy S22', 'Galaxy S23', 'Galaxy S24',
            'Galaxy Note 20', 'Pixel 4', 'Pixel 5', 'Pixel 6', 'Pixel 7', 'Pixel 8',
            'Huawei P40', 'Huawei P50', 'Huawei Mate',
            'OnePlus 8', 'OnePlus 9', 'OnePlus 10', 'OnePlus 11',
        ];
        const hasToF = isAndroid && tofModels.some(m => deviceModel.includes(m));

        // Check native module availability
        let nativeCapabilities = {
            hasLiDAR: false,
            hasToF: false,
            hasDualCamera: false,
            hasAutofocusDistance: true,
        };

        if (DepthSensorModule?.getCapabilities) {
            try {
                nativeCapabilities = await DepthSensorModule.getCapabilities();
            } catch (e) {
                console.warn('Failed to get native depth capabilities:', e);
            }
        }

        return {
            hasLiDAR: hasLiDAR || nativeCapabilities.hasLiDAR,
            hasToF: hasToF || nativeCapabilities.hasToF,
            hasDualCamera: nativeCapabilities.hasDualCamera,
            hasAutofocusDistance: nativeCapabilities.hasAutofocusDistance,
            maxDepthRange: nativeCapabilities.hasLiDAR ? 5000 : nativeCapabilities.hasToF ? 1000 : undefined,
            minDepthRange: nativeCapabilities.hasLiDAR ? 50 : nativeCapabilities.hasToF ? 30 : undefined,
        };
    }

    /**
     * Get current depth/distance reading
     */
    async getDepth(): Promise<DepthInfo> {
        try {
            if (!this.capabilities) {
                await this.initialize();
            }

            // Try LiDAR first (most accurate)
            if (this.capabilities?.hasLiDAR) {
                return await this.getLiDARDepth();
            }

            // Try ToF sensor
            if (this.capabilities?.hasToF) {
                return await this.getToFDepth();
            }

            // Fallback to focus distance
            if (this.capabilities?.hasAutofocusDistance) {
                return await this.getFocusBasedDepth();
            }

            return this.getNoDepthInfo();
        } catch (error) {
            console.error('Depth reading error:', error);
            return this.getNoDepthInfo();
        }
    }

    /**
     * Get depth using LiDAR sensor
     */
    private async getLiDARDepth(): Promise<DepthInfo> {
        if (!DepthSensorModule?.getLiDARDepth) {
            return this.getNoDepthInfo();
        }

        try {
            const data = await DepthSensorModule.getLiDARDepth();
            const distanceMM = data.centerDepth;

            return this.createDepthInfo('lidar', distanceMM, 0.95, data);
        } catch (error) {
            console.error('LiDAR depth error:', error);
            return this.getNoDepthInfo();
        }
    }

    /**
     * Get depth using ToF sensor
     */
    private async getToFDepth(): Promise<DepthInfo> {
        if (!DepthSensorModule?.getToFDepth) {
            return this.getNoDepthInfo();
        }

        try {
            const data = await DepthSensorModule.getToFDepth();
            const distanceMM = data.distance;

            return this.createDepthInfo('tof', distanceMM, 0.85, data);
        } catch (error) {
            console.error('ToF depth error:', error);
            return this.getNoDepthInfo();
        }
    }

    /**
     * Estimate depth using camera focus distance
     */
    private async getFocusBasedDepth(): Promise<DepthInfo> {
        if (CameraMetadataModule?.getFocusDistance) {
            try {
                const focusDistance = await CameraMetadataModule.getFocusDistance();

                // Focus distance is usually in diopters, convert to mm
                // Distance (mm) = 1000 / diopters
                let distanceMM: number | null = null;
                if (focusDistance > 0) {
                    distanceMM = Math.round(1000 / focusDistance);
                }

                return this.createDepthInfo('focus', distanceMM, 0.6, { focusDistance });
            } catch (error) {
                console.error('Focus distance error:', error);
            }
        }

        return this.getNoDepthInfo();
    }

    /**
     * Create depth info object
     */
    private createDepthInfo(
        sensorType: 'lidar' | 'tof' | 'focus' | 'none',
        distanceMM: number | null,
        baseConfidence: number,
        rawData?: Record<string, unknown>
    ): DepthInfo {
        const distanceCM = distanceMM ? Math.round(distanceMM / 10) : null;

        let isOptimalDistance = false;
        let recommendation = '';
        let confidence = baseConfidence;

        if (distanceMM !== null) {
            if (distanceMM < OPTIMAL_DISTANCE.MIN) {
                recommendation = `Move device further away (currently ${distanceCM}cm, need ${OPTIMAL_DISTANCE.MIN / 10}cm+)`;
                confidence *= 0.8;
            } else if (distanceMM > OPTIMAL_DISTANCE.MAX) {
                recommendation = `Move device closer (currently ${distanceCM}cm, need under ${OPTIMAL_DISTANCE.MAX / 10}cm)`;
                confidence *= 0.8;
            } else {
                isOptimalDistance = true;
                const deviation = Math.abs(distanceMM - OPTIMAL_DISTANCE.IDEAL);
                if (deviation < 30) {
                    recommendation = 'Distance is optimal';
                } else {
                    recommendation = `Good distance (${distanceCM}cm), ideal is ${OPTIMAL_DISTANCE.IDEAL / 10}cm`;
                }
            }
        } else {
            recommendation = 'Unable to measure distance';
            confidence = 0;
        }

        const info: DepthInfo = {
            hasDepthSensor: sensorType !== 'none',
            sensorType,
            distanceMM,
            distanceCM,
            confidence,
            isOptimalDistance,
            recommendation,
            rawData: rawData as DepthInfo['rawData'],
        };

        this.lastDepthReading = info;
        return info;
    }

    /**
     * Create empty depth info
     */
    private getNoDepthInfo(): DepthInfo {
        return {
            hasDepthSensor: false,
            sensorType: 'none',
            distanceMM: null,
            distanceCM: null,
            confidence: 0,
            isOptimalDistance: false,
            recommendation: 'No depth sensor available. Position cassette 15-20cm from camera.',
        };
    }

    /**
     * Get last cached depth reading
     */
    getLastReading(): DepthInfo | null {
        return this.lastDepthReading;
    }

    /**
     * Get sensor capabilities
     */
    getCapabilities(): DepthSensorCapabilities | null {
        return this.capabilities;
    }

    /**
     * Check if device has any depth sensing capability
     */
    hasDepthCapability(): boolean {
        if (!this.capabilities) return false;
        return this.capabilities.hasLiDAR ||
            this.capabilities.hasToF ||
            this.capabilities.hasAutofocusDistance;
    }

    /**
     * Get optimal distance range for UI display
     */
    getOptimalDistanceRange(): { min: number; max: number; ideal: number } {
        return {
            min: OPTIMAL_DISTANCE.MIN / 10, // in cm
            max: OPTIMAL_DISTANCE.MAX / 10,
            ideal: OPTIMAL_DISTANCE.IDEAL / 10,
        };
    }
}

export const depthSensingService = new DepthSensingService();
