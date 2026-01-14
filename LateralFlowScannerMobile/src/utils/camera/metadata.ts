import { CameraDevice } from 'react-native-vision-camera';

export const extractCameraMetadata = (device: CameraDevice): any => {
    return {
        id: device.id,
        name: device.name,
        position: device.position,
        hasFlash: device.hasFlash,
        hasTorch: device.hasTorch,
        minZoom: device.minZoom,
        maxZoom: device.maxZoom,
        neutralZoom: device.neutralZoom,
        supportsFocus: device.supportsFocus,
        supportsRawCapture: device.supportsRawCapture,
        supportsLowLightBoost: device.supportsLowLightBoost,
        // supportsDepthCapture is now a per-format property in newer vision-camera versions
        supportsDepthCapture: device.formats.some(format => format.supportsDepthCapture),
        formats: device.formats.length,
    };
};

export const selectOptimalFormat = (device: CameraDevice, targetResolution: { width: number; height: number }) => {
    const formats = device.formats.filter(format =>
        format.photoWidth >= targetResolution.width &&
        format.photoHeight >= targetResolution.height
    );

    if (formats.length === 0) {
        return device.formats[0];
    }

    // Select format closest to target resolution
    return formats.reduce((best, current) => {
        const bestDiff = Math.abs(best.photoWidth - targetResolution.width) +
            Math.abs(best.photoHeight - targetResolution.height);
        const currentDiff = Math.abs(current.photoWidth - targetResolution.width) +
            Math.abs(current.photoHeight - targetResolution.height);

        return currentDiff < bestDiff ? current : best;
    });
};