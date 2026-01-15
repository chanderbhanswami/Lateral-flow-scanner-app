import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '../screens/HomeScreen';
import { CaptureScreen } from '../screens/CaptureScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { ConcentrationManagementScreen } from '../screens/ConcentrationManagementScreen';
import { GuideScreen } from '../screens/GuideScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { NotificationScreen } from '../screens/NotificationScreen';
import { StatisticsScreen } from '../screens/StatisticsScreen';
import { MainStackParamList } from './types';

const Stack = createStackNavigator<MainStackParamList>();

const MainNavigator: React.FC = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Capture"
                component={CaptureScreen}
                options={{ title: 'Capture', headerShown: true }}
            />
            <Stack.Screen
                name="Review"
                component={ReviewScreen}
                options={{ title: 'Review', headerShown: true }}
            />
            <Stack.Screen
                name="ConcentrationManagement"
                component={ConcentrationManagementScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Guide"
                component={GuideScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="History"
                component={HistoryScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ChangePassword"
                component={ChangePasswordScreen}
                options={{ title: 'Change Password', headerShown: true }}
            />
            <Stack.Screen
                name="Notifications"
                component={NotificationScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Statistics"
                component={StatisticsScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
};

export default MainNavigator;