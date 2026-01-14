export const determineLightingCondition = (illuminance: number): string => {
    if (illuminance < 10) {
        return 'Very Dark';
    } else if (illuminance < 50) {
        return 'Dark';
    } else if (illuminance < 200) {
        return 'Dim';
    } else if (illuminance < 400) {
        return 'Normal Indoor';
    } else if (illuminance < 1000) {
        return 'Bright Indoor';
    } else if (illuminance < 10000) {
        return 'Overcast Outdoor';
    } else if (illuminance < 25000) {
        return 'Daylight';
    } else {
        return 'Bright Sunlight';
    }
};

export const recommendExposureAdjustment = (illuminance: number): number => {
    if (illuminance < 100) {
        return 1.5; // Increase exposure
    } else if (illuminance < 400) {
        return 0.5;
    } else if (illuminance > 10000) {
        return -1.0; // Decrease exposure
    } else {
        return 0; // No adjustment needed
    }
};

export const isLightingAdequate = (illuminance: number): boolean => {
    return illuminance >= 100 && illuminance <= 25000;
};