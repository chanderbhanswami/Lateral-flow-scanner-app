export const extractBasicExif = (exifData: any): any => {
    return {
        make: exifData.make || 'Unknown',
        model: exifData.model || 'Unknown',
        dateTime: exifData.dateTime || new Date().toISOString(),
        orientation: exifData.orientation || 1,
        exposureTime: exifData.exposureTime || 0,
        fNumber: exifData.fNumber || 0,
        iso: exifData.iso || 0,
        focalLength: exifData.focalLength || 0,
        whiteBalance: exifData.whiteBalance || 0,
        flash: exifData.flash || 0,
    };
};

export const exifOrientationToRotation = (orientation: number): number => {
    const rotationMap: { [key: number]: number } = {
        1: 0,
        3: 180,
        6: 90,
        8: 270,
    };

    return rotationMap[orientation] || 0;
};

export const shouldRotateImage = (orientation: number): boolean => {
    return orientation === 6 || orientation === 8;
};