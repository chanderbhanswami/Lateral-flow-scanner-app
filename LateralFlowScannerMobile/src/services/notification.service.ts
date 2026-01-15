import { Platform } from 'react-native';
import notifee, { AndroidImportance, EventType, AuthorizationStatus, TriggerType } from '@notifee/react-native';
import {
    getMessaging,
    getToken,
    onMessage,
    onTokenRefresh,
    registerDeviceForRemoteMessages,
} from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../constants';

class NotificationService {
    private messaging = getMessaging();

    async configure() {
        // Request permissions on configuration
        await this.requestPermissions();

        // Create the default channel
        if (Platform.OS === 'android') {
            await notifee.createChannel({
                id: 'default',
                name: 'Default Channel',
                importance: AndroidImportance.HIGH,
                sound: 'default',
            });
        }

        // Handle FCM Token
        const registerToken = async () => {
            try {
                if (Platform.OS === 'android') {
                    await registerDeviceForRemoteMessages(this.messaging);
                }
                const token = await getToken(this.messaging);
                console.log('TOKEN:', token);
                await this.syncToken(token);
            } catch (error) {
                console.log('Failed to get FCM token:', error);
            }
        };

        registerToken();

        // Listen for token refresh
        onTokenRefresh(this.messaging, token => {
            console.log('TOKEN REFRESH:', token);
            this.syncToken(token);
        });

        // Handle foreground messages
        onMessage(this.messaging, async remoteMessage => {
            console.log('NOTIFICATION:', remoteMessage);

            // Display local notification if message contains notification payload
            if (remoteMessage.notification) {
                await notifee.displayNotification({
                    title: remoteMessage.notification.title,
                    body: remoteMessage.notification.body,
                    android: {
                        channelId: 'default',
                        // pressAction is needed if you want to detect press in onForegroundEvent
                        pressAction: {
                            id: 'default',
                        },
                    },
                });
            }
        });

        // Handle foreground interactions
        notifee.onForegroundEvent(({ type, detail }) => {
            switch (type) {
                case EventType.DISMISSED:
                    console.log('User dismissed notification', detail.notification);
                    break;
                case EventType.PRESS:
                    console.log('User pressed notification', detail.notification);
                    break;
            }
        });
    }

    private async syncToken(token: string) {
        try {
            // Import here to avoid circular dependency
            const { storageService } = require('./storage.service');

            // Only sync token if user is authenticated (has access token)
            // Otherwise, we'd get 401 errors that show confusing network toasts
            const accessToken = await storageService.getAccessToken();
            if (!accessToken) {
                console.log('[NotificationService] Skipping FCM sync - user not authenticated');
                return;
            }

            const storedToken = await AsyncStorage.getItem('fcm_token');
            if (storedToken !== token) {
                // Send to backend
                await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.REGISTER_TOKEN, { token });
                await AsyncStorage.setItem('fcm_token', token);
                console.log('FCM Token synced with backend');
            }
        } catch (error) {
            // console.error('Failed to sync FCM token:', error);
            // Silent fail to avoid spamming logs if backend is down
        }
    }

    async showLocalNotification(title: string, message: string) {
        await notifee.displayNotification({
            title,
            body: message,
            android: {
                channelId: 'default',
                sound: 'default',
            },
            ios: {
                sound: 'default',
            }
        });
    }

    async scheduleNotification(title: string, message: string, date: Date) {
        await notifee.createTriggerNotification(
            {
                title,
                body: message,
                android: {
                    channelId: 'default',
                    sound: 'default',
                },
                ios: {
                    sound: 'default',
                }
            },
            {
                type: TriggerType.TIMESTAMP,
                timestamp: date.getTime(),
            }
        );
    }

    async cancelAllNotifications() {
        await notifee.cancelAllNotifications();
    }

    async requestPermissions(): Promise<boolean> {
        const settings = await notifee.requestPermission();
        return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
    }
}

export const notificationService = new NotificationService();