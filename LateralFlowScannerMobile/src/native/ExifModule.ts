import { NativeModules } from 'react-native';

const { ExifModule } = NativeModules;

export interface ExifModuleNative {
    extractExifData(imagePath: string): Promise<any>;
    writeExifData(imagePath: string, exifDict: any): Promise<boolean>;
    embedExifInImage(imageBase64: string, exifDict: any): Promise<string>;
}

export const ExifModuleNative: ExifModuleNative = {
    extractExifData: async (imagePath: string) => {
        if (ExifModule?.extractExifData) {
            return await ExifModule.extractExifData(imagePath);
        }
        return {};
    },

    writeExifData: async (imagePath: string, exifDict: any) => {
        if (ExifModule?.writeExifData) {
            return await ExifModule.writeExifData(imagePath, exifDict);
        }
        return false;
    },

    embedExifInImage: async (imageBase64: string, exifDict: any) => {
        if (ExifModule?.embedExifInImage) {
            return await ExifModule.embedExifInImage(imageBase64, exifDict);
        }
        return '';
    },
};