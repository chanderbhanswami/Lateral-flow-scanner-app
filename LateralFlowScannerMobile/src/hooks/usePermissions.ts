import { useState, useEffect } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, Permission, openSettings } from 'react-native-permissions';
import { logger } from '../utils/logger';

// Permission statuses
type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable' | 'limited' | 'unknown';

export const usePermissions = () => {
    const [cameraPermission, setCameraPermission] = useState<PermissionStatus>('unknown');
    const [microphonePermission, setMicrophonePermission] = useState<PermissionStatus>('unknown');
    const [locationPermission, setLocationPermission] = useState<PermissionStatus>('unknown');
    const [motionPermission, setMotionPermission] = useState<PermissionStatus>('unknown');
    const [isChecking, setIsChecking] = useState(false);

    const mapStatus = (result: string): PermissionStatus => {
        if (result === RESULTS.GRANTED) return 'granted';
        if (result === RESULTS.DENIED) return 'denied';
        if (result === RESULTS.BLOCKED) return 'blocked';
        if (result === RESULTS.UNAVAILABLE) return 'unavailable';
        if (result === RESULTS.LIMITED) return 'limited';
        return 'unknown';
    };

    const checkPermissions = async () => {
        setIsChecking(true);
        try {
            const camera = Platform.select({
                ios: PERMISSIONS.IOS.CAMERA,
                android: PERMISSIONS.ANDROID.CAMERA,
            }) as Permission;

            const microphone = Platform.select({
                ios: PERMISSIONS.IOS.MICROPHONE,
                android: PERMISSIONS.ANDROID.RECORD_AUDIO,
            }) as Permission;

            const location = Platform.select({
                ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
                android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
            }) as Permission;

            const motion = Platform.select({
                ios: PERMISSIONS.IOS.MOTION,
                android: null,
            }) as Permission | null;

            const [cameraStatus, micStatus, locStatus, motionStatus] = await Promise.all([
                check(camera),
                check(microphone),
                check(location),
                motion ? check(motion) : Promise.resolve(RESULTS.GRANTED),
            ]);

            setCameraPermission(mapStatus(cameraStatus));
            setMicrophonePermission(mapStatus(micStatus));
            setLocationPermission(mapStatus(locStatus));
            setMotionPermission(mapStatus(motionStatus));

            logger.debug('Permissions checked', { camera: cameraStatus, microphone: micStatus, location: locStatus });
        } finally {
            setIsChecking(false);
        }
    };

    const requestCameraPermission = async (): Promise<boolean> => {
        const permission = Platform.select({
            ios: PERMISSIONS.IOS.CAMERA,
            android: PERMISSIONS.ANDROID.CAMERA,
        }) as Permission;

        const result = await request(permission);
        setCameraPermission(mapStatus(result));

        if (result === RESULTS.BLOCKED) {
            showSettingsAlert('Camera');
        }

        return result === RESULTS.GRANTED;
    };

    const requestMicrophonePermission = async (): Promise<boolean> => {
        const permission = Platform.select({
            ios: PERMISSIONS.IOS.MICROPHONE,
            android: PERMISSIONS.ANDROID.RECORD_AUDIO,
        }) as Permission;

        const result = await request(permission);
        setMicrophonePermission(mapStatus(result));

        if (result === RESULTS.BLOCKED) {
            showSettingsAlert('Microphone');
        }

        return result === RESULTS.GRANTED;
    };

    const requestLocationPermission = async (): Promise<boolean> => {
        const permission = Platform.select({
            ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
            android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        }) as Permission;

        const result = await request(permission);
        setLocationPermission(mapStatus(result));

        if (result === RESULTS.BLOCKED) {
            showSettingsAlert('Location');
        }

        return result === RESULTS.GRANTED;
    };

    const requestAllPermissions = async (): Promise<boolean> => {
        const results = await Promise.all([
            requestCameraPermission(),
            requestMicrophonePermission(),
        ]);

        return results.every(result => result);
    };

    const showSettingsAlert = (permissionName: string) => {
        Alert.alert(
            `${permissionName} Permission Required`,
            `Please enable ${permissionName.toLowerCase()} permission in settings to use this feature.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => openSettings() },
            ]
        );
    };

    useEffect(() => {
        checkPermissions();
    }, []);

    return {
        cameraPermission,
        microphonePermission,
        locationPermission,
        motionPermission,
        isChecking,
        requestCameraPermission,
        requestMicrophonePermission,
        requestLocationPermission,
        requestAllPermissions,
        checkPermissions,
        openSettings: () => openSettings(),
        hasCameraPermission: cameraPermission === 'granted',
        hasMicrophonePermission: microphonePermission === 'granted',
        hasAllPermissions:
            cameraPermission === 'granted' &&
            microphonePermission === 'granted',
    };
};