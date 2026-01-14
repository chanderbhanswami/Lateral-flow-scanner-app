import { CameraDevice } from 'react-native-vision-camera';

export const calculateFocusDistance = (
    subjectDistance: number,
    device: CameraDevice
): number => {
    // Calculate optimal focus distance
    // Normalized distance (0 = closest, 1 = infinity)

    if (subjectDistance < 0.3) {
        return 0.1; // Close focus
    } else if (subjectDistance < 1.0) {
        return 0.3; // Medium focus
    } else {
        return 1.0; // Far focus
    }
};

export const isFocusStable = (
    currentFocus: number,
    targetFocus: number,
    threshold: number = 0.05
): boolean => {
    return Math.abs(currentFocus - targetFocus) < threshold;
};

export const estimateSubjectDistance = (
    blurScore: number,
    focusDistance: number
): number => {
    // Estimate subject distance based on blur score and focus
    // This is a simplified estimation

    if (blurScore > 1500) {
        return focusDistance;
    } else if (blurScore > 1000) {
        return focusDistance * 1.2;
    } else {
        return focusDistance * 1.5;
    }
};