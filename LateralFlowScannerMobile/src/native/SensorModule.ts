import { NativeModules, NativeEventEmitter } from 'react-native';

const { SensorModule } = NativeModules;
const sensorEmitter = new NativeEventEmitter(SensorModule);

export interface SensorModuleNative {
    startLightSensor(): void;
    stopLightSensor(): void;
    startProximitySensor(): void;
    stopProximitySensor(): void;
    startAccelerometer(interval: number): void;
    stopAccelerometer(): void;
    startGyroscope(interval: number): void;
    stopGyroscope(): void;
}

export const SensorModuleNative: SensorModuleNative = {
    startLightSensor: () => {
        if (SensorModule?.startLightSensor) {
            SensorModule.startLightSensor();
        }
    },

    stopLightSensor: () => {
        if (SensorModule?.stopLightSensor) {
            SensorModule.stopLightSensor();
        }
    },

    startProximitySensor: () => {
        if (SensorModule?.startProximitySensor) {
            SensorModule.startProximitySensor();
        }
    },

    stopProximitySensor: () => {
        if (SensorModule?.stopProximitySensor) {
            SensorModule.stopProximitySensor();
        }
    },

    startAccelerometer: (interval: number) => {
        if (SensorModule?.startAccelerometer) {
            SensorModule.startAccelerometer(interval);
        }
    },

    stopAccelerometer: () => {
        if (SensorModule?.stopAccelerometer) {
            SensorModule.stopAccelerometer();
        }
    },

    startGyroscope: (interval: number) => {
        if (SensorModule?.startGyroscope) {
            SensorModule.startGyroscope(interval);
        }
    },

    stopGyroscope: () => {
        if (SensorModule?.stopGyroscope) {
            SensorModule.stopGyroscope();
        }
    },
};

export { sensorEmitter };