import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { checkInternetConnection, getConnectionQuality, getNetworkType, isWiFiConnection } from '../utils/network';

export const useNetworkStatus = () => {
    const [isConnected, setIsConnected] = useState<boolean>(true);
    const [connectionType, setConnectionType] = useState<string>('unknown');
    const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'none'>('good');

    useEffect(() => {
        // Get initial state
        const fetchInitialState = async () => {
            const connected = await checkInternetConnection();
            const type = await getNetworkType();
            const quality = await getConnectionQuality();
            setIsConnected(connected);
            setConnectionType(type);
            setConnectionQuality(quality);
        };
        fetchInitialState();

        // Subscribe to changes
        const unsubscribe = NetInfo.addEventListener(async (state) => {
            setIsConnected(state.isConnected ?? false);
            setConnectionType(state.type);
            // Update quality on change
            const quality = await getConnectionQuality();
            setConnectionQuality(quality);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return {
        isConnected,
        connectionType,
        connectionQuality,
        isWifi: connectionType === 'wifi',
        isCellular: connectionType === 'cellular',
        isGoodConnection: connectionQuality === 'excellent' || connectionQuality === 'good',
    };
};