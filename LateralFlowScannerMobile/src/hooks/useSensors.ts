import { useState, useEffect, useCallback } from 'react';
import { accelerometer, gyroscope, magnetometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import { AllSensorData, DeviceMotion, AlignmentAnalysis } from '../types';
import { SENSOR_CONSTANTS } from '../constants';
import { sensorService } from '../services/sensor.service';

// Import utilities
import { detectShakeWorklet, getOrientationFromAccelWorklet, lowPassFilterWorklet } from '../utils/sensors/accelerometer';
import { detectStabilityWorklet } from '../utils/sensors/gyroscope';
import { analyzeLightLevelWorklet } from '../utils/sensors/lightSensor';
import { checkProximityWorklet } from '../utils/sensors/proximity';
import { analyzeAlignmentWorklet } from '../utils/analysis/alignment';

export const useSensors = () => {
    const [sensorData, setSensorData] = useState<AllSensorData | null>(null);
    const [isShaking, setIsShaking] = useState(false);
    const [isStable, setIsStable] = useState(true);
    const [lightLevel, setLightLevel] = useState(0);
    const [lightAnalysis, setLightAnalysis] = useState<{ level: string; isAdequate: boolean; recommendation: string } | null>(null);
    const [proximity, setProximity] = useState<number | null>(null);
    const [proximityWarning, setProximityWarning] = useState<string | null>(null);
    const [orientation, setOrientation] = useState<string>('portrait');
    const [alignment, setAlignment] = useState<AlignmentAnalysis | null>(null);

    // Smoothed accelerometer values for stability
    const [smoothedAccel, setSmoothedAccel] = useState({ x: 0, y: 0, z: -9.81 });

    useEffect(() => {
        setUpdateIntervalForType(SensorTypes.accelerometer, SENSOR_CONSTANTS.ACCELEROMETER.UPDATE_INTERVAL);
        setUpdateIntervalForType(SensorTypes.gyroscope, SENSOR_CONSTANTS.GYROSCOPE.UPDATE_INTERVAL);
        setUpdateIntervalForType(SensorTypes.magnetometer, 200);

        const accelerometerSub = accelerometer.subscribe(({ x, y, z, timestamp }) => {
            // Use utility for shake detection
            const shakeResult = detectShakeWorklet(x, y, z, SENSOR_CONSTANTS.ACCELEROMETER.SHAKE_THRESHOLD);
            setIsShaking(shakeResult.isShaking);

            // Use utility for orientation
            const orientResult = getOrientationFromAccelWorklet(x, y, z);
            setOrientation(orientResult.orientation);

            // Use utility for alignment - map to shared AlignmentAnalysis format
            const alignResult = analyzeAlignmentWorklet(x, y, z);
            setAlignment({
                isAligned: alignResult.isLevel,
                pitch: alignResult.tiltY,
                roll: alignResult.tiltX,
                yaw: alignResult.tiltZ,
                levelness: alignResult.alignmentScore,
                recommendation: alignResult.recommendation
            });

            // Smooth values using low-pass filter utility
            setSmoothedAccel(prev => ({
                x: lowPassFilterWorklet(x, prev.x, 0.8),
                y: lowPassFilterWorklet(y, prev.y, 0.8),
                z: lowPassFilterWorklet(z, prev.z, 0.8)
            }));

            setSensorData(prev => ({
                ...prev!,
                accelerometer: { x, y, z, timestamp },
                deviceMotion: {
                    ...prev?.deviceMotion!,
                    acceleration: { x, y, z, timestamp },
                    isShaking: shakeResult.isShaking,
                    shakingIntensity: shakeResult.magnitude,
                },
            }));
        });

        const gyroscopeSub = gyroscope.subscribe(({ x, y, z, timestamp }) => {
            // Use utility for stability detection
            const stabilityResult = detectStabilityWorklet(x, y, z);
            setIsStable(stabilityResult.isStable);

            setSensorData(prev => ({
                ...prev!,
                gyroscope: { x, y, z, timestamp },
                deviceMotion: {
                    ...prev?.deviceMotion!,
                    rotationRate: { x, y, z, timestamp },
                    isStable: stabilityResult.isStable,
                    rotationSpeed: stabilityResult.rotationSpeed,
                },
            }));
        });

        const magnetometerSub = magnetometer.subscribe(({ x, y, z, timestamp }) => {
            setSensorData(prev => ({
                ...prev!,
                magnetometer: { x, y, z, timestamp },
            }));
        });

        // Initialize light sensor with utility analysis
        sensorService.initLightSensor((lux: number) => {
            setLightLevel(lux);
            // Use utility for light analysis
            const lightResult = analyzeLightLevelWorklet(lux);
            setLightAnalysis(lightResult);
        });

        // Initialize proximity sensor with utility analysis
        sensorService.initProximitySensor((distance: number | null) => {
            setProximity(distance);
            // Use utility for proximity warning
            const proxResult = checkProximityWorklet(distance !== null && distance < 5, distance);
            setProximityWarning(proxResult.warning);
        });

        return () => {
            accelerometerSub.unsubscribe();
            gyroscopeSub.unsubscribe();
            magnetometerSub.unsubscribe();
            sensorService.cleanup();
        };
    }, []);

    const getOrientation = useCallback(() => {
        return orientation;
    }, [orientation]);

    const getAlignment = useCallback(() => {
        return alignment;
    }, [alignment]);

    const getLightAnalysis = useCallback(() => {
        return lightAnalysis;
    }, [lightAnalysis]);

    return {
        sensorData,
        isShaking,
        isStable,
        lightLevel,
        lightAnalysis,
        proximity,
        proximityWarning,
        orientation,
        alignment,
        getOrientation,
        getAlignment,
        getLightAnalysis,
    };
};