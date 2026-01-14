import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '../screens/HomeScreen';
import { CaptureScreen } from '../screens/CaptureScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { ConcentrationManagementScreen } from '../screens/ConcentrationManagementScreen';
import { GuideScreen } from '../screens/GuideScreen';
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
                options={{ title: 'Concentration Batches', headerShown: true }}
            />
            <Stack.Screen
                name="Guide"
                component={GuideScreen}
                options={{ title: 'Guide', headerShown: true }}
            />
            <Stack.Screen
                name="Notifications"
                component={NotificationScreen}
                options={{ title: 'Notifications', headerShown: true }}
            />
            <Stack.Screen
                name="Statistics"
                component={StatisticsScreen}
                options={{ title: 'Statistics', headerShown: true }}
            />
        </Stack.Navigator>
    );
};

export default MainNavigator;