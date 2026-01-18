import { StackScreenProps } from '@react-navigation/stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { CaptureData } from '../types';

// Root Stack
export type RootStackParamList = {
    Auth: undefined;
    Main: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = StackScreenProps<
    RootStackParamList,
    T
>;

// Auth Stack
export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
    OTPVerification: { email: string; type: 'registration' | 'password_reset' | 'login' };
    ResetPassword: { email?: string; token?: string; otp?: string };
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<
    AuthStackParamList,
    T
>;

// Main Stack
export type MainStackParamList = {
    Home: undefined;
    Capture: { concentrationBatchId?: string } | undefined;
    Review: { captureData: CaptureData; imageUri: string };
    ConcentrationManagement: undefined;
    Guide: undefined;
    Settings: undefined;
    History: undefined;
    ChangePassword: undefined;
    ManageSessions: undefined;
    Notifications: undefined;
    Statistics: undefined;
    EditProfile: undefined;
};

export type MainStackScreenProps<T extends keyof MainStackParamList> = StackScreenProps<
    MainStackParamList,
    T
>;

// Bottom Tab (if needed)
export type MainTabParamList = {
    HomeTab: undefined;
    HistoryTab: undefined;
    SettingsTab: undefined;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
>;

// Combined types for convenience
export type HomeScreenProps = MainStackScreenProps<'Home'>;
export type CaptureScreenProps = MainStackScreenProps<'Capture'>;
export type ReviewScreenProps = MainStackScreenProps<'Review'>;
export type ConcentrationManagementScreenProps = MainStackScreenProps<'ConcentrationManagement'>;
export type GuideScreenProps = MainStackScreenProps<'Guide'>;
export type SettingsScreenProps = MainStackScreenProps<'Settings'>;
export type HistoryScreenProps = MainStackScreenProps<'History'>;

export type LoginScreenProps = AuthStackScreenProps<'Login'>;
export type RegisterScreenProps = AuthStackScreenProps<'Register'>;
export type ForgotPasswordScreenProps = AuthStackScreenProps<'ForgotPassword'>;
export type OTPVerificationScreenProps = AuthStackScreenProps<'OTPVerification'>;
export type ResetPasswordScreenProps = AuthStackScreenProps<'ResetPassword'>;

// Navigation prop types
declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}