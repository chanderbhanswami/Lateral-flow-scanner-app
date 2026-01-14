import NetInfo from '@react-native-community/netinfo';

export const checkInternetConnection = async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return state.isConnected || false;
};

export const getNetworkType = async (): Promise<string> => {
    const state = await NetInfo.fetch();
    return state.type || 'unknown';
};

export const isWiFiConnection = async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return state.type === 'wifi';
};

export const waitForConnection = async (timeoutMs: number = 30000): Promise<boolean> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            unsubscribe();
            resolve(false);
        }, timeoutMs);

        const unsubscribe = NetInfo.addEventListener((state) => {
            if (state.isConnected) {
                clearTimeout(timeout);
                unsubscribe();
                resolve(true);
            }
        });
    });
};

export const getConnectionQuality = async (): Promise<'excellent' | 'good' | 'poor' | 'none'> => {
    const state = await NetInfo.fetch();

    if (!state.isConnected) {
        return 'none';
    }

    // For WiFi, check details if available
    if (state.type === 'wifi' && state.details) {
        const strength = (state.details as any).strength;
        if (strength >= 80) return 'excellent';
        if (strength >= 50) return 'good';
        return 'poor';
    }

    // For cellular
    if (state.type === 'cellular' && state.details) {
        const cellularGeneration = (state.details as any).cellularGeneration;
        if (cellularGeneration === '5g') return 'excellent';
        if (cellularGeneration === '4g') return 'good';
        return 'poor';
    }

    return 'good';
};