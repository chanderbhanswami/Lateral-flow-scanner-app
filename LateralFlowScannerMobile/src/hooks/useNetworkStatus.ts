import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
    const [isConnected, setIsConnected] = useState<boolean>(true);
    const [connectionType, setConnectionType] = useState<string>('unknown');

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected ?? false);
            setConnectionType(state.type);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return {
        isConnected,
        connectionType,
        isWifi: connectionType === 'wifi',
        isCellular: connectionType === 'cellular',
    };
};