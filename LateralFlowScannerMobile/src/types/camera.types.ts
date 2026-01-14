import { CameraDevice, CameraProps, CameraDeviceFormat } from 'react-native-vision-camera';

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