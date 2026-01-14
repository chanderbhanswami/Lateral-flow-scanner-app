import { create } from 'zustand';
import { AllSensorData } from '../types';

interface SensorState {
    sensorData: AllSensorData | null;
    isShaking: boolean;
    lightLevel: number;
    proximity: number | null;
    setSensorData: (data: AllSensorData | null) => void;
    setIsShaking: (isShaking: boolean) => void;
    setLightLevel: (level: number) => void;
    setProximity: (distance: number | null) => void;
}

export const useSensorStore = create<SensorState>((set) => ({
    sensorData: null,
    isShaking: false,
    lightLevel: 0,
    proximity: null,

    setSensorData: (data) => set({ sensorData: data }),
    setIsShaking: (isShaking) => set({ isShaking }),
    setLightLevel: (level) => set({ lightLevel: level }),
    setProximity: (distance) => set({ proximity: distance }),
}));
