import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
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

    // Robust Initialization (Updated to use react-native-permissions)
    const checkPermissions = useCallback(async () => {
        const getPermission = async () => {
            if (Platform.OS !== 'android') return true; // TODO: iOS support

            // 1. CHECK Current Status
            const status = await check(PERMISSIONS.ANDROID.CAMERA);

            console.log(`[Permission] Initial Status: ${status}`);

            if (status === RESULTS.GRANTED) {
                setPermissionStatus('granted');
                return true;
            }

            if (status === RESULTS.DENIED) {
                // 2. REQUEST if Denied (Requestable)
                console.log('[Permission] Requesting...');
                const newStatus = await request(PERMISSIONS.ANDROID.CAMERA);
                console.log(`[Permission] Post-Request Status: ${newStatus}`);

                if (newStatus === RESULTS.GRANTED) {
                    setPermissionStatus('granted');
                    return true;
                }

                setPermissionStatus('denied'); // Denied or Blocked
                return false;
            }

            if (status === RESULTS.BLOCKED) {
                console.log('[Permission] BLOCKED by OS (Don\'t ask again)');
                setPermissionStatus('denied'); // Treat blocked as denied for UI purposes (shows Open Settings)
                return false;
            }

            // UNAVAILABLE or limited
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