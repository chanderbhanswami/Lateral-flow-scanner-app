import React from 'react';
import { BaseToast, ErrorToast, InfoToast, BaseToastProps } from 'react-native-toast-message';

export const toastConfig = {
    success: (props: BaseToastProps) => (
        <BaseToast
            {...props}
            style={{
                borderLeftColor: '#10b981',
                borderLeftWidth: 5,
                height: 70,
            }}
            contentContainerStyle={{
                paddingHorizontal: 15,
            }}
            text1Style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#1f2937',
            }}
            text2Style={{
                fontSize: 14,
                color: '#6b7280',
            }}
            text2NumberOfLines={2}
        />
    ),

    error: (props: BaseToastProps) => (
        <ErrorToast
            {...props}
            style={{
                borderLeftColor: '#ef4444',
                borderLeftWidth: 5,
                height: 70,
            }}
            text1Style={{
                fontSize: 16,
                fontWeight: '600',
            }}
            text2Style={{
                fontSize: 14,
            }}
            text2NumberOfLines={2}
        />
    ),

    info: (props: BaseToastProps) => (
        <InfoToast
            {...props}
            style={{
                borderLeftColor: '#3b82f6',
                borderLeftWidth: 5,
                height: 70,
            }}
            text1Style={{
                fontSize: 16,
                fontWeight: '600',
            }}
            text2Style={{
                fontSize: 14,
            }}
            text2NumberOfLines={2}
        />
    ),

    warning: (props: BaseToastProps) => (
        <BaseToast
            {...props}
            style={{
                borderLeftColor: '#f59e0b',
                borderLeftWidth: 5,
                height: 70,
                backgroundColor: '#fffbeb',
            }}
            text1Style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#92400e',
            }}
            text2Style={{
                fontSize: 14,
                color: '#78350f',
            }}
            text2NumberOfLines={2}
        />
    ),
};