import { SensorData } from './sensor.types';

export interface CaptureData {
    id: string;
    userId: string;
    timestamp: string;
    imageUrl: string;
    imageKey: string;
    imagePath: string;
    imageSize: number;
    imageWidth: number;
    imageHeight: number;
    concentration: string;
    concentrationBatchId?: string;
    cameraMetadata: CameraMetadata;
    exifData: ExifData;
    sensorData: SensorData;
    analysisData: ImageAnalysisData;
    deviceInfo: DeviceInfo;
    captureMode: 'auto' | 'manual';
    status: 'pending' | 'uploaded' | 'processed' | 'failed';
    notes?: string;
}

export interface CameraMetadata {
    make: string;
    model: string;
    lensModel: string;
    focalLength: number;
    focalLengthIn35mm: number;
    aperture: number;
    iso: number;
    exposureTime: number;
    whiteBalance: number;
    flash: boolean;
    digitalZoom: number;
    opticalZoom: number;
    timestamp: string;
}

export interface ExifData {
    make: string;
    model: string;
    orientation: number;
    xResolution: number;
    yResolution: number;
    resolutionUnit: number;
    software: string;
    dateTime: string;
    yCbCrPositioning: number;
    exifOffset: number;
    gpsInfo: GPSInfo | null;
    exposureTime: number;
    fNumber: number;
    exposureProgram: number;
    isoSpeedRatings: number;
    exifVersion: string;
    dateTimeOriginal: string;
    dateTimeDigitized: string;
    componentConfiguration: string;
    shutterSpeedValue: number;
    apertureValue: number;
    brightnessValue: number;
    exposureBiasValue: number;
    maxApertureValue: number;
    meteringMode: number;
    flash: number;
    focalLength: number;
    subjectArea: number[];
    flashpixVersion: string;
    colorSpace: number;
    pixelXDimension: number;
    pixelYDimension: number;
    sensingMethod: number;
    sceneType: number;
    exposureMode: number;
    whiteBalance: number;
    focalLengthIn35mmFilm: number;
    sceneCaptureType: number;
    lensSpecification: number[];
    lensMake: string;
    lensModel: string;
}

export interface GPSInfo {
    latitude: number;
    longitude: number;
    altitude: number;
    timestamp: string;
    expires?: string;
}

export interface ImageAnalysisData {
    histogram: HistogramData;
    hsvData: HSVData;
    exposureAnalysis: ExposureAnalysis;
    blurAnalysis: BlurAnalysis;
    borderDetection: BorderDetection;
    shadowAnalysis: ShadowAnalysis;
    reflectionAnalysis: ReflectionAnalysis;
    alignmentAnalysis: AlignmentAnalysis;
    obstructionAnalysis?: ObstructionAnalysis;
    qualityScore: number;
    warnings: string[];
    recommendations: string[];
}

export interface ObstructionAnalysis {
    hasObstruction: boolean;
    obstructionType: 'finger' | 'object' | 'partial' | 'none';
    coverage: number; // 0-100 percentage
    confidence: number; // 0-1
    details: {
        edgeLoss: number;
        patternLoss: number;
        brightnessAnomalies: number;
        histogramSkew: number;
        colorAnomalies: number;
    };
    recommendation: string;
}

export interface HistogramData {
    red: number[];
    green: number[];
    blue: number[];
    brightness: number[];
    contrast: number;
    mean: number;
    std: number;
}

export interface HSVData {
    hue: number[];
    saturation: number[];
    value: number[];
    meanHue: number;
    meanSaturation: number;
    meanValue: number;
}

export interface ExposureAnalysis {
    isUnderexposed: boolean;
    isOverexposed: boolean;
    exposureLevel: number;
    dynamicRange: number;
    clippedHighlights: number;
    crushedShadows: number;
    recommendation: string;
}

export interface BlurAnalysis {
    isBlurry: boolean;
    blurScore: number;
    laplacianVariance: number;
    edgeStrength: number;
    focusQuality: number;
}

export interface BorderDetection {
    detected: boolean;
    confidence: number;
    corners: Array<{ x: number; y: number }>;
    area: number;
    aspectRatio: number;
    isAligned: boolean;
    isCentered: boolean;
    distanceFromCenter: number;
}

export interface ShadowAnalysis {
    hasShadow: boolean;
    shadowCoverage: number;
    shadowIntensity: number;
    shadowLocations: Array<{ x: number; y: number; size: number }>;
}

export interface ReflectionAnalysis {
    hasReflection: boolean;
    reflectionIntensity: number;
    glareDetected: boolean;
    affectedArea: number;
}

export interface AlignmentAnalysis {
    isAligned: boolean;
    pitch: number;
    roll: number;
    yaw: number;
    levelness: number;
    recommendation: string;
}

export interface DeviceInfo {
    deviceId: string;
    brand: string;
    model: string;
    systemName: string;
    systemVersion: string;
    appVersion: string;
    buildNumber: string;
    isTablet: boolean;
    hasNotch: boolean;
}