import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import { AppState, AppStateStatus } from 'react-native';
import { CameraConfig, CameraMetadata } from '../types';
import { CAMERA_CONSTANTS } from '../constants';
import { cameraService } from '../services/camera.service';

export const useCamera = (highQualityMode: boolean = true) => {
    const device = useCameraDevice('back');
    const format = useCameraFormat(device, [
        { photoResolution: highQualityMode ? 'max' : 'high' },
        { fps: CAMERA_CONSTANTS.TARGET_FPS },
        { pixelFormat: 'yuv' } as any
    ]);

    const [hasPermission, setHasPermission] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'not-determined'>('not-determined');
    const [cameraKey, setCameraKey] = useState(0); // Used to force remount
    const appState = useRef(AppState.currentState);

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
        photoQualityBalance: 'quality',
    });

    const [metadata, setMetadata] = useState<CameraMetadata | null>(null);
    const cameraRef = useRef<Camera | null>(null);

    // Robust Initialization
    const checkPermissions = useCallback(async () => {
        const getPermission = async () => {
            const status = await Camera.getCameraPermissionStatus();
            if (status === 'granted') {
                setPermissionStatus('granted');
                return true;
            }
            if (status === 'not-determined') {
                const newStatus = await Camera.requestCameraPermission();
                if (newStatus === 'granted') {
                    setPermissionStatus('granted');
                    return true;
                } else {
                    setPermissionStatus('denied'); // Explicitly denied after request
                    return false;
                }
            }

            // If already denied or restricted
            setPermissionStatus('denied');
            return false;
        };

        const isGranted = await getPermission();
        setHasPermission(isGranted);

        if (isGranted) {
            // Force a small delay to allow native camera resources to free up
            // especially if permission was JUST granted dialog overlay.
            setTimeout(() => {
                setConfig(prev => ({ ...prev, isActive: true }));
                // Increment key to force fresh mount of native view
                setCameraKey(k => k + 1);
            }, 500);
        }
    }, []);

    // Monitor AppState (In case user goes to Settings -> Allow -> Back)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // App came to foreground, re-check everything
                checkPermissions();
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [checkPermissions]);

    // Initial Check
    useEffect(() => {
        checkPermissions();
    }, [checkPermissions]);

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
        hasPermission, // Exported
        permissionStatus, // Exported
        cameraKey,     // Exported
        initializeCamera: checkPermissions, // Renamed but kept signature compatible-ish
        capturePhoto,
        lockExposure,
        lockWhiteBalance,
        setZoom,
        toggleTorch,
        setFocusMode,
    };
};