export const isObjectNearCamera = (distance: number): boolean => {
    return distance < 5; // cm
};

export const detectCameraObstruction = (
    distance: number,
    brightness: number
): boolean => {
    // If proximity sensor shows something close AND brightness drops
    return distance < 3 && brightness < 50;
};

export const calculateObstructionPercentage = (
    distance: number,
    maxDistance: number = 5
): number => {
    if (distance >= maxDistance) return 0;
    return ((maxDistance - distance) / maxDistance) * 100;
};