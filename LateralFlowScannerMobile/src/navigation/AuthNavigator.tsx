import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { OTPVerificationScreen } from '../screens/OTPVerificationScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { AuthStackParamList } from './types';

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                cardStyleInterpolator: ({ current: { progress } }) => ({
                    cardStyle: {
                        opacity: progress,
                    },
                }),
            }}
        >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Navigator>
    );
};

export default AuthNavigator;