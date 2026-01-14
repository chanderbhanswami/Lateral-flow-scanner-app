import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { Loading } from '../components/UI/Loading';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
    const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    if (isLoading) {
        return <Loading text="Loading..." />;
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isAuthenticated ? (
                <Stack.Screen name="Main" component={MainNavigator} />
            ) : (
                <Stack.Screen name="Auth" component={AuthNavigator} />
            )}
        </Stack.Navigator>
    );
};

export default AppNavigator;