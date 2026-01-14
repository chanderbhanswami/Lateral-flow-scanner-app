import ImageResizer from 'react-native-image-resizer';

export const compressImage = async (
    uri: string,
    options: {
        maxWidth?: number;
        maxHeight?: number;
        quality?: number;
        format?: 'JPEG' | 'PNG';
    } = {}
): Promise<string> => {
    const {
        maxWidth = 2048,
        maxHeight = 2048,
        quality = 90,
        format = 'JPEG',
    } = options;

    try {
        const result = await ImageResizer.createResizedImage(
            uri,
            maxWidth,
            maxHeight,
            format,
            quality,
            0,
            undefined,
            false,
            { mode: 'contain' }
        );

        return result.uri;
    } catch (error) {
        console.error('Image compression error:', error);
        return uri;
    }
};

export const getImageDimensions = (uri: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const Image = require('react-native').Image;
        Image.getSize(
            uri,
            (width: number, height: number) => resolve({ width, height }),
            (error: any) => reject(error)
        );
    });
};

export const calculateOptimalDimensions = (
    currentWidth: number,
    currentHeight: number,
    maxWidth: number = 2048,
    maxHeight: number = 2048
): { width: number; height: number } => {
    const aspectRatio = currentWidth / currentHeight;

    let width = currentWidth;
    let height = currentHeight;

    if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
    }

    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
    }

    return {
        width: Math.round(width),
        height: Math.round(height),
    };
};