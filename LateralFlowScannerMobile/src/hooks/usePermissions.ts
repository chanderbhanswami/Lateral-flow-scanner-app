import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

export const usePermissions = () => {
    const [cameraPermission, setCameraPermission] = useState<string>('unknown');
    const [microphonePermission, setMicrophonePermission] = useState<string>('unknown');
    const [locationPermission, setLocationPermission] = useState<string>('unknown');
    const [motionPermission, setMotionPermission] = useState<string>('unknown');

    const checkPermissions = async () => {
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

        setCameraPermission(cameraStatus);
        setMicrophonePermission(micStatus);
        setLocationPermission(locStatus);
        setMotionPermission(motionStatus);
    };

    const requestCameraPermission = async () => {
        const permission = Platform.select({
            ios: PERMISSIONS.IOS.CAMERA,
            android: PERMISSIONS.ANDROID.CAMERA,
        }) as Permission;

        const result = await request(permission);
        setCameraPermission(result);
        return result === RESULTS.GRANTED;
    };

    const requestMicrophonePermission = async () => {
        const permission = Platform.select({
            ios: PERMISSIONS.IOS.MICROPHONE,
            android: PERMISSIONS.ANDROID.RECORD_AUDIO,
        }) as Permission;

        const result = await request(permission);
        setMicrophonePermission(result);
        return result === RESULTS.GRANTED;
    };

    const requestLocationPermission = async () => {
        const permission = Platform.select({
            ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
            android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        }) as Permission;

        const result = await request(permission);
        setLocationPermission(result);
        return result === RESULTS.GRANTED;
    };

    const requestAllPermissions = async () => {
        const results = await Promise.all([
            requestCameraPermission(),
            requestMicrophonePermission(),
            requestLocationPermission(),
        ]);

        return results.every(result => result);
    };

    useEffect(() => {
        checkPermissions();
    }, []);

    return {
        cameraPermission,
        microphonePermission,
        locationPermission,
        motionPermission,
        requestCameraPermission,
        requestMicrophonePermission,
        requestLocationPermission,
        requestAllPermissions,
        checkPermissions,
        hasAllPermissions:
            cameraPermission === RESULTS.GRANTED &&
            microphonePermission === RESULTS.GRANTED,
    };
};