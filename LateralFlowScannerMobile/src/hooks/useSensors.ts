import { useState, useEffect, useCallback, useRef } from 'react';
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

    // Throttling Ref
    const lastUpdateRef = useRef(0);

    useEffect(() => {
        setUpdateIntervalForType(SensorTypes.accelerometer, SENSOR_CONSTANTS.ACCELEROMETER.UPDATE_INTERVAL);
        setUpdateIntervalForType(SensorTypes.gyroscope, SENSOR_CONSTANTS.GYROSCOPE.UPDATE_INTERVAL);
        setUpdateIntervalForType(SensorTypes.magnetometer, 200);

        const accelerometerSub = accelerometer.subscribe(({ x, y, z, timestamp }) => {
            // 1. Run Analysis Logic (Always running for accuracy)
            const shakeResult = detectShakeWorklet(x, y, z, SENSOR_CONSTANTS.ACCELEROMETER.SHAKE_THRESHOLD);
            const orientResult = getOrientationFromAccelWorklet(x, y, z);
            const alignResult = analyzeAlignmentWorklet(x, y, z);

            const smoothX = lowPassFilterWorklet(x, smoothedAccel.x, 0.8);
            const smoothY = lowPassFilterWorklet(y, smoothedAccel.y, 0.8);
            const smoothZ = lowPassFilterWorklet(z, smoothedAccel.z, 0.8);

            // 2. Throttle UI Updates (20 FPS / 50ms)
            const now = Date.now();
            if (now - lastUpdateRef.current > 50) {
                lastUpdateRef.current = now;

                setIsShaking(shakeResult.isShaking);
                setOrientation(orientResult.orientation);
                setAlignment({
                    isAligned: alignResult.isLevel,
                    pitch: alignResult.tiltY,
                    roll: alignResult.tiltX,
                    yaw: alignResult.tiltZ,
                    levelness: alignResult.alignmentScore,
                    recommendation: alignResult.recommendation
                });
                setSmoothedAccel({ x: smoothX, y: smoothY, z: smoothZ });

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
            }
        });

        const gyroscopeSub = gyroscope.subscribe(({ x, y, z, timestamp }) => {
            // Gyro updates can piggyback or be throttled independently. 
            // Since we use a single 'sensorData' object, let's just update it when accel triggers or throttle this too.
            // Throttling this independently to prevent double-renders if timestamps rely on it.
            // Simplified: We accept that Gyro might update slightly out of sync with Accel in UI, which is fine.

            // Stability check
            const stabilityResult = detectStabilityWorklet(x, y, z);

            // We can throttle this setter too, but accessing the *same* lastUpdateRef might cause starvation if they fire interleaving.
            // Let's use a standard "Update if significant change OR throttled time".
            // For now, simple throttle is fine.
            setIsStable(stabilityResult.isStable); // Critical for capture, update immediately or throttle? 
            // Updating immediately is better for "Capture Block", but 60Hz is too fast. 
            // Let's rely on React batching or throttle this too.

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
            // Magnetometer is already slow (200ms)
            setSensorData(prev => ({
                ...prev!,
                magnetometer: { x, y, z, timestamp },
            }));
        });

        // Initialize light sensor with utility analysis
        sensorService.initLightSensor((lux: number) => {
            // Light sensor is usually event-based (change only), so it might not need throttling.
            setLightLevel(lux);
            const lightResult = analyzeLightLevelWorklet(lux);
            setLightAnalysis(lightResult);
        });

        // Initialize proximity sensor with utility analysis
        sensorService.initProximitySensor((distance: number | null) => {
            setProximity(distance);
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