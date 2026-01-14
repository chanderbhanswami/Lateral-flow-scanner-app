export const WHITE_BALANCE_PRESETS = {
    AUTO: 'auto',
    DAYLIGHT: 5500,
    CLOUDY: 6500,
    SHADE: 7500,
    TUNGSTEN: 3200,
    FLUORESCENT: 4000,
    FLASH: 5500,
} as const;

export const calculateWhiteBalance = (
    rMean: number,
    gMean: number,
    bMean: number
): { r: number; g: number; b: number } => {
    // Calculate white balance multipliers
    const max = Math.max(rMean, gMean, bMean);

    return {
        r: max / rMean,
        g: max / gMean,
        b: max / bMean,
    };
};

export const detectColorTemperature = (
    rMean: number,
    gMean: number,
    bMean: number
): number => {
    // Simplified color temperature detection
    const ratio = bMean / rMean;

    if (ratio > 1.2) {
        return 6500; // Cool (bluish)
    } else if (ratio < 0.8) {
        return 3200; // Warm (reddish)
    } else {
        return 5500; // Neutral
    }
};