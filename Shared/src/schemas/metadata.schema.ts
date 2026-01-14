import { z } from 'zod';

export const cameraMetadataSchema = z.object({
    make: z.string(),
    model: z.string(),
    lensModel: z.string(),
    focalLength: z.number(),
    focalLengthIn35mm: z.number(),
    aperture: z.number(),
    iso: z.number(),
    exposureTime: z.number(),
    whiteBalance: z.number(),
    flash: z.boolean(),
    digitalZoom: z.number(),
    opticalZoom: z.number(),
    timestamp: z.string(),
});

export const exifDataSchema = z.object({
    make: z.string(),
    model: z.string(),
    orientation: z.number(),
    dateTime: z.string(),
    exposureTime: z.number(),
    fNumber: z.number(),
    iso: z.number(),
    focalLength: z.number(),
    whiteBalance: z.number(),
    flash: z.number(),
    lensMake: z.string(),
    lensModel: z.string(),
});

export const sensorDataSchema = z.object({
    accelerometer: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
        timestamp: z.number(),
    }),
    gyroscope: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
        timestamp: z.number(),
    }),
    lightSensor: z.object({
        illuminance: z.number(),
        timestamp: z.number(),
    }),
    orientation: z.object({
        pitch: z.number(),
        roll: z.number(),
        azimuth: z.number(),
        timestamp: z.number(),
    }),
});
