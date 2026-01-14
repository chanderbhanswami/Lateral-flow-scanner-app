import { HSVData } from '../../types';

/**
 * Convert RGB to HSV
 */
export const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    let s = max === 0 ? 0 : delta / max;
    let v = max;

    if (delta !== 0) {
        if (max === r) {
            h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        } else if (max === g) {
            h = ((b - r) / delta + 2) / 6;
        } else {
            h = ((r - g) / delta + 4) / 6;
        }
    }

    return [h * 360, s * 100, v * 100];
};

/**
 * Calculate HSV histogram from image data
 */
export const calculateHSV = (
    pixels: Uint8ClampedArray,
    width: number,
    height: number
): HSVData => {
    const hue = new Array(360).fill(0);
    const saturation = new Array(100).fill(0);
    const value = new Array(100).fill(0);

    let sumH = 0, sumS = 0, sumV = 0;
    const totalPixels = width * height;

    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        const [h, s, v] = rgbToHsv(r, g, b);

        hue[Math.floor(h)]++;
        saturation[Math.floor(s)]++;
        value[Math.floor(v)]++;

        sumH += h;
        sumS += s;
        sumV += v;
    }

    return {
        hue,
        saturation,
        value,
        meanHue: sumH / totalPixels,
        meanSaturation: sumS / totalPixels,
        meanValue: sumV / totalPixels,
    };
};

/**
 * Detect color cast
 */
export const detectColorCast = (histogram: any): string | null => {
    const rMean = histogram.red.reduce((sum: number, val: number, i: number) => sum + val * i, 0) /
        histogram.red.reduce((a: number, b: number) => a + b, 0);
    const gMean = histogram.green.reduce((sum: number, val: number, i: number) => sum + val * i, 0) /
        histogram.green.reduce((a: number, b: number) => a + b, 0);
    const bMean = histogram.blue.reduce((sum: number, val: number, i: number) => sum + val * i, 0) /
        histogram.blue.reduce((a: number, b: number) => a + b, 0);

    const threshold = 10;

    if (rMean > gMean + threshold && rMean > bMean + threshold) {
        return 'red';
    } else if (gMean > rMean + threshold && gMean > bMean + threshold) {
        return 'green';
    } else if (bMean > rMean + threshold && bMean > gMean + threshold) {
        return 'blue';
    }

    return null;
};