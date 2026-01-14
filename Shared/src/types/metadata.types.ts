import { CameraMetadata, ImageAnalysisData, DeviceInfo } from './capture.types';
import { SensorData } from './sensor.types';

export interface CaptureMetadata {
    captureId: string;
    userId: string;
    timestamp: string;
    camera: CameraMetadata;
    sensors: SensorData;
    analysis: ImageAnalysisData;
    device: DeviceInfo;
    environment: EnvironmentData;
    processing: ProcessingMetadata;
}

export interface EnvironmentData {
    lightLevel: number;
    lightCondition: 'bright' | 'normal' | 'dim' | 'dark';
    ambientTemperature?: number;
    location?: {
        latitude: number;
        longitude: number;
        altitude: number;
        timestamp: string;
    };
}

export interface ProcessingMetadata {
    processingTime: number;
    frameProcessorVersion: string;
    algorithmVersion: string;
    calibrationUsed: boolean;
    compressionApplied: boolean;
    filtersApplied: string[];
}

export interface QualityMetrics {
    overallScore: number;
    blurScore: number;
    exposureScore: number;
    alignmentScore: number;
    borderDetectionScore: number;
    lightingScore: number;
}

export interface CaptureStatistics {
    totalCaptures: number;
    successfulCaptures: number;
    failedCaptures: number;
    averageQualityScore: number;
    autoCapturePercentage: number;
    manualCapturePercentage: number;
}

export interface SessionMetadata {
    sessionId: string;
    startTime: string;
    endTime?: string;
    captureCount: number;
    deviceInfo: DeviceInfo;
}