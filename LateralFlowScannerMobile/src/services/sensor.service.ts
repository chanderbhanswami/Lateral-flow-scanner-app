import { NativeModules, NativeEventEmitter } from 'react-native';
import { AllSensorData, OrientationData, AlignmentAnalysis } from '@lateralflowscanner/shared';
import { SENSOR_CONSTANTS, ALIGNMENT_THRESHOLDS } from '../constants';

const { SensorModule } = NativeModules;
const sensorEmitter = new NativeEventEmitter(SensorModule);

class SensorService {
    private lightSubscription: any = null;
    private proximitySubscription: any = null;

    initLightSensor(callback: (level: number) => void) {
        if (SensorModule && SensorModule.startLightSensor) {
            SensorModule.startLightSensor();
            this.lightSubscription = sensorEmitter.addListener('onLightSensorChange', (data) => {
                callback(data.illuminance);
            });
        }
    }

    initProximitySensor(callback: (distance: number) => void) {
        if (SensorModule && SensorModule.startProximitySensor) {
            SensorModule.startProximitySensor();
            this.proximitySubscription = sensorEmitter.addListener('onProximityChange', (data) => {
                callback(data.distance);
            });
        }
    }

    calculateOrientation(sensorData: AllSensorData | null): OrientationData | null {
        if (!sensorData) return null;

        const { accelerometer, magnetometer } = sensorData;
        if (!accelerometer || !magnetometer) return null;

        // Calculate orientation from accelerometer and magnetometer
        const pitch = Math.atan2(accelerometer.y, Math.sqrt(accelerometer.x ** 2 + accelerometer.z ** 2));
        const roll = Math.atan2(accelerometer.x, Math.sqrt(accelerometer.y ** 2 + accelerometer.z ** 2));
        const azimuth = Math.atan2(magnetometer.y, magnetometer.x);

        return {
            pitch: (pitch * 180) / Math.PI,
            roll: (roll * 180) / Math.PI,
            azimuth: (azimuth * 180) / Math.PI,
            timestamp: Date.now(),
        };
    }

    calculateAlignment(sensorData: AllSensorData | null): AlignmentAnalysis {
        const orientation = this.calculateOrientation(sensorData);

        if (!orientation) {
            return {
                isAligned: false,
                pitch: 0,
                roll: 0,
                yaw: 0,
                levelness: 0,
                recommendation: 'Unable to determine alignment',
            };
        }

        const { pitch, roll, azimuth } = orientation;

        const isPitchAligned = Math.abs(pitch) <= ALIGNMENT_THRESHOLDS.PITCH.ACCEPTABLE[1];
        const isRollAligned = Math.abs(roll) <= ALIGNMENT_THRESHOLDS.ROLL.ACCEPTABLE[1];
        const isAligned = isPitchAligned && isRollAligned;

        let recommendation = '';
        if (!isPitchAligned) {
            recommendation += pitch > 0 ? 'Tilt device down. ' : 'Tilt device up. ';
        }
        if (!isRollAligned) {
            recommendation += roll > 0 ? 'Rotate device left. ' : 'Rotate device right. ';
        }
        if (isAligned) {
            recommendation = 'Device is properly aligned';
        }

        const levelness = 1 - Math.min(Math.abs(pitch) + Math.abs(roll), 90) / 90;

        return {
            isAligned,
            pitch,
            roll,
            yaw: azimuth,
            levelness,
            recommendation,
        };
    }

    cleanup() {
        if (this.lightSubscription) {
            this.lightSubscription.remove();
            if (SensorModule && SensorModule.stopLightSensor) {
                SensorModule.stopLightSensor();
            }
        }
        if (this.proximitySubscription) {
            this.proximitySubscription.remove();
            if (SensorModule && SensorModule.stopProximitySensor) {
                SensorModule.stopProximitySensor();
            }
        }
    }
}

export const sensorService = new SensorService();