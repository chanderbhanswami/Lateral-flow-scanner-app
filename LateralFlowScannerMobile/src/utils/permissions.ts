import { Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

export const requestCameraPermission = async (): Promise<boolean> => {
    const permission = Platform.select({
        ios: PERMISSIONS.IOS.CAMERA,
        android: PERMISSIONS.ANDROID.CAMERA,
    }) as Permission;

    const result = await request(permission);

    if (result === RESULTS.BLOCKED || result === RESULTS.DENIED) {
        Alert.alert(
            'Camera Permission Required',
            'Please enable camera permission in settings to use this feature.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
        );
        return false;
    }

    return result === RESULTS.GRANTED;
};

export const checkCameraPermission = async (): Promise<boolean> => {
    const permission = Platform.select({
        ios: PERMISSIONS.IOS.CAMERA,
        android: PERMISSIONS.ANDROID.CAMERA,
    }) as Permission;

    const result = await check(permission);
    return result === RESULTS.GRANTED;
};

export const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
        const result = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
        return result === RESULTS.GRANTED;
    }
    return true; // iOS doesn't need explicit storage permission
};

export const requestLocationPermission = async (): Promise<boolean> => {
    const permission = Platform.select({
        ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    }) as Permission;

    const result = await request(permission);
    return result === RESULTS.GRANTED;
};