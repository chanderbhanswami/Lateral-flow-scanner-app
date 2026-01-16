import { NativeModules, NativeEventEmitter } from 'react-native';
import { AllSensorData, OrientationData, AlignmentAnalysis } from '@lateralflowscanner/shared';
import { SENSOR_CONSTANTS, ALIGNMENT_THRESHOLDS } from '../constants';

// Import utilities
import { analyzeAlignmentWorklet } from '../utils/analysis/alignment';
import { getOrientationFromAccelWorklet } from '../utils/sensors/accelerometer';

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

        // Use utility for orientation from accelerometer
        const orientResult = getOrientationFromAccelWorklet(
            accelerometer.x,
            accelerometer.y,
            accelerometer.z
        );

        // Calculate azimuth from magnetometer
        const azimuth = Math.atan2(magnetometer.y, magnetometer.x);

        return {
            pitch: orientResult.tiltAngle,
            roll: Math.atan2(accelerometer.x, Math.sqrt(accelerometer.y ** 2 + accelerometer.z ** 2)) * (180 / Math.PI),
            azimuth: (azimuth * 180) / Math.PI,
            timestamp: Date.now(),
        };
    }

    calculateAlignment(sensorData: AllSensorData | null): AlignmentAnalysis {
        if (!sensorData || !sensorData.accelerometer) {
            return {
                isAligned: false,
                pitch: 0,
                roll: 0,
                yaw: 0,
                levelness: 0,
                recommendation: 'Unable to determine alignment',
            };
        }

        const { accelerometer } = sensorData;

        // Use utility for alignment analysis
        const alignResult = analyzeAlignmentWorklet(
            accelerometer.x,
            accelerometer.y,
            accelerometer.z
        );

        // Get orientation for yaw if magnetometer available
        const orientation = this.calculateOrientation(sensorData);
        const yaw = orientation?.azimuth || 0;

        return {
            isAligned: alignResult.isLevel,
            pitch: alignResult.tiltY,
            roll: alignResult.tiltX,
            yaw,
            levelness: alignResult.alignmentScore,
            recommendation: alignResult.recommendation,
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