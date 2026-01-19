import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import { CameraConfig, CameraMetadata } from '../types';
import { CAMERA_CONSTANTS } from '../constants';
import { cameraService } from '../services/camera.service';

export const useCamera = (highQualityMode: boolean = true) => {
    const device = useCameraDevice('back');
    const format = useCameraFormat(device, [
        { photoResolution: highQualityMode ? 'max' : 'high' },
        { fps: CAMERA_CONSTANTS.TARGET_FPS },
        { pixelFormat: 'yuv' } as any // Explicitly request YUV
    ]);

    const [config, setConfig] = useState<CameraConfig>({
        device,
        isActive: false,
        format,
        fps: CAMERA_CONSTANTS.TARGET_FPS,
        zoom: 1.0,
        exposure: 0,
        focusMode: 'auto',
        whiteBalance: 'auto',
        torch: 'off',
        lowLightBoost: false,
        photoQualityBalance: 'quality', // Prioritize quality over speed
    });

    const [metadata, setMetadata] = useState<CameraMetadata | null>(null);
    const cameraRef = useRef<Camera | null>(null);

    const initializeCamera = useCallback(async () => {
        const hasPermission = await cameraService.checkPermission();
        if (!hasPermission) {
            const granted = await cameraService.requestPermission();
            if (!granted) {
                throw new Error('Camera permission denied');
            }
            // CRITICAL: On Android/iOS, obtaining permission doesn't immediately make the camera resource available.
            // We wait to ensure the OS has fully propagated the permission state.
            await new Promise(resolve => setTimeout(() => resolve(true), 1000));
        }

        // Activate camera
        setConfig(prev => ({ ...prev, isActive: true }));

        // Double check: If we just got permission, sometimes a toggle is needed.
        // But usually a sufficient delay works. 
    }, []);

    const capturePhoto = useCallback(async () => {
        if (!cameraRef.current || !config.isActive) {
            throw new Error('Camera not ready');
        }

        const photo = await cameraRef.current.takePhoto({
            flash: config.torch === 'on' ? 'on' : 'off',
            enableShutterSound: true,
        });

        return photo;
    }, [config]);

    const lockExposure = useCallback(async (value: number) => {
        setConfig(prev => ({ ...prev, exposure: value, whiteBalance: 'locked' }));
    }, []);

    const lockWhiteBalance = useCallback(async () => {
        setConfig(prev => ({ ...prev, whiteBalance: 'locked' }));
    }, []);

    const setZoom = useCallback((value: number) => {
        setConfig(prev => ({ ...prev, zoom: value }));
    }, []);

    const toggleTorch = useCallback(() => {
        setConfig(prev => ({ ...prev, torch: prev.torch === 'off' ? 'on' : 'off' }));
    }, []);

    const setFocusMode = useCallback((mode: 'auto' | 'manual') => {
        setConfig(prev => ({ ...prev, focusMode: mode }));
    }, []);

    useEffect(() => {
        if (device) {
            const meta = cameraService.extractCameraMetadata(device);
            setMetadata(meta);
        }
    }, [device]);

    return {
        cameraRef,
        config,
        metadata,
        device,
        format,
        initializeCamera,
        capturePhoto,
        lockExposure,
        lockWhiteBalance,
        setZoom,
        toggleTorch,
        setFocusMode,
    };
};