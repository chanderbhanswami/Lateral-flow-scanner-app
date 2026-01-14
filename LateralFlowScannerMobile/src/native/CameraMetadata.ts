import { NativeModules } from 'react-native';

const { CameraMetadataModule } = NativeModules;

export interface CameraMetadataNative {
    getCameraCapabilities(): Promise<any>;
    getDeviceMake(): Promise<string>;
    getDeviceModel(): Promise<string>;
}

export const CameraMetadata: CameraMetadataNative = {
    getCameraCapabilities: async () => {
        if (CameraMetadataModule?.getCameraCapabilities) {
            return await CameraMetadataModule.getCameraCapabilities();
        }
        return {};
    },

    getDeviceMake: async () => {
        if (CameraMetadataModule?.getDeviceMake) {
            return await CameraMetadataModule.getDeviceMake();
        }
        return 'Unknown';
    },

    getDeviceModel: async () => {
        if (CameraMetadataModule?.getDeviceModel) {
            return await CameraMetadataModule.getDeviceModel();
        }
        return 'Unknown';
    },
};