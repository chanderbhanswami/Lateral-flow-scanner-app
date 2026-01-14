export interface AccelerometerData {
    x: number;
    y: number;
    z: number;
    timestamp: number;
}

export interface GyroscopeData {
    x: number;
    y: number;
    z: number;
    timestamp: number;
}

export interface MagnetometerData {
    x: number;
    y: number;
    z: number;
    timestamp: number;
}

export interface OrientationData {
    azimuth: number;
    pitch: number;
    roll: number;
    timestamp: number;
}

export interface LightSensorData {
    illuminance: number;
    timestamp: number;
}

export interface ProximityData {
    isNear: boolean;
    distance: number;
    timestamp: number;
}

export interface DepthData {
    distance: number;
    confidence: number;
    timestamp: number;
}

export interface DeviceMotion {
    rotation: OrientationData;
    acceleration: AccelerometerData;
    gravity: { x: number; y: number; z: number };
    rotationRate: GyroscopeData;
    isShaking: boolean;
    shakingIntensity: number;
}

export interface AllSensorData {
    accelerometer: AccelerometerData;
    gyroscope: GyroscopeData;
    magnetometer: MagnetometerData;
    orientation: OrientationData;
    lightSensor: LightSensorData;
    proximity: ProximityData;
    depth: DepthData | null;
    deviceMotion: DeviceMotion;
}

// Alias for backward compatibility if needed, matching the old "SensorData" interface name in Shared
// but employing the new structure
export type SensorData = AllSensorData;
