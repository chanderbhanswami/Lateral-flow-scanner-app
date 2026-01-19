import { CameraDevice, CameraProps, CameraDeviceFormat } from 'react-native-vision-camera';
import {
    HistogramData,
    BlurAnalysis,
    ExposureAnalysis,
    ShadowAnalysis,
    ReflectionAnalysis
} from '@lateralflowscanner/shared';

export interface CameraConfig {
    device: CameraDevice | undefined;
    isActive: boolean;
    format: CameraDeviceFormat | undefined;
    fps: number;
    zoom: number;
    exposure: number;
    focusMode: 'auto' | 'manual';
    whiteBalance: 'auto' | 'locked';
    torch: 'off' | 'on';
    lowLightBoost: boolean;
    photoQualityBalance: 'speed' | 'balanced' | 'quality';
}

export interface CameraFormat {
    photoWidth: number;
    photoHeight: number;
    videoWidth: number;
    videoHeight: number;
    maxISO: number;
    minISO: number;
    maxFps: number;
    minFps: number;
    maxZoom: number;
    supportsRawCapture: boolean;
    supportsDepthCapture: boolean;
}


export interface FocusInfo {
    mode: 'auto' | 'manual' | 'locked';
    distance: number | null;
    isStable: boolean;
    confidence: number;
}

export interface ExposureInfo {
    mode: 'auto' | 'manual' | 'locked';
    value: number;
    targetBrightness: number;
    bias: number;
    compensation: number;
}

export interface FrameAnalysis {
    blurAnalysis?: BlurAnalysis;
    exposureAnalysis?: ExposureAnalysis;
    shadowAnalysis?: ShadowAnalysis;
    reflectionAnalysis?: ReflectionAnalysis;
    whiteBalanceAnalysis?: { isBalanced: boolean; dominantChannel: string; correction: { r: number; g: number; b: number; }; };
    colorAnalysis?: {
        saturation: number;
        colorTemperature?: number;
        dominantColor?: { r: number; g: number; b: number; };
        whiteBalanceOffset?: { r: number; g: number; b: number; };
        isNeutral?: boolean;
        recommendation?: string;
    };
    focusAnalysis?: { needsFocus: boolean; };
    histogram?: HistogramData;
    histogramStats?: { mean: number; std: number; median: number; mode: number; };
}

export interface AnalysisResult extends FrameAnalysis {
    qualityScore: number;
    warnings: string[];
    recommendations: string[];
    borderCorners?: Array<{ x: number; y: number }>;
    borderDetection?: { detected: boolean; };
}