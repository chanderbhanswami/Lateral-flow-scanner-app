import { useState, useEffect, useCallback } from 'react';
import { accelerometer, gyroscope, magnetometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import { AllSensorData, DeviceMotion } from '../types';
import { SENSOR_CONSTANTS } from '../constants';
import { sensorService } from '../services/sensor.service';

export const useSensors = () => {
    const [sensorData, setSensorData] = useState<AllSensorData | null>(null);
    const [isShaking, setIsShaking] = useState(false);
    const [lightLevel, setLightLevel] = useState(0);
    const [proximity, setProximity] = useState<number | null>(null);

    useEffect(() => {
        setUpdateIntervalForType(SensorTypes.accelerometer, SENSOR_CONSTANTS.ACCELEROMETER.UPDATE_INTERVAL);
        setUpdateIntervalForType(SensorTypes.gyroscope, SENSOR_CONSTANTS.GYROSCOPE.UPDATE_INTERVAL);
        setUpdateIntervalForType(SensorTypes.magnetometer, 200);

        const accelerometerSub = accelerometer.subscribe(({ x, y, z, timestamp }) => {
            const magnitude = Math.sqrt(x * x + y * y + z * z);
            const shaking = magnitude > SENSOR_CONSTANTS.ACCELEROMETER.SHAKE_THRESHOLD;
            setIsShaking(shaking);

            setSensorData(prev => ({
                ...prev!,
                accelerometer: { x, y, z, timestamp },
                deviceMotion: {
                    ...prev?.deviceMotion!,
                    acceleration: { x, y, z, timestamp },
                    isShaking: shaking,
                    shakingIntensity: magnitude,
                },
            }));
        });

        const gyroscopeSub = gyroscope.subscribe(({ x, y, z, timestamp }) => {
            setSensorData(prev => ({
                ...prev!,
                gyroscope: { x, y, z, timestamp },
                deviceMotion: {
                    ...prev?.deviceMotion!,
                    rotationRate: { x, y, z, timestamp },
                },
            }));
        });

        const magnetometerSub = magnetometer.subscribe(({ x, y, z, timestamp }) => {
            setSensorData(prev => ({
                ...prev!,
                magnetometer: { x, y, z, timestamp },
            }));
        });

        // Initialize light sensor
        sensorService.initLightSensor(setLightLevel);

        // Initialize proximity sensor
        sensorService.initProximitySensor(setProximity);

        return () => {
            accelerometerSub.unsubscribe();
            gyroscopeSub.unsubscribe();
            magnetometerSub.unsubscribe();
            sensorService.cleanup();
        };
    }, []);

    const getOrientation = useCallback(() => {
        return sensorService.calculateOrientation(sensorData);
    }, [sensorData]);

    const getAlignment = useCallback(() => {
        return sensorService.calculateAlignment(sensorData);
    }, [sensorData]);

    return {
        sensorData,
        isShaking,
        lightLevel,
        proximity,
        getOrientation,
        getAlignment,
    };
};