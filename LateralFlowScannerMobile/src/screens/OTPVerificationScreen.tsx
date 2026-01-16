import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    Platform,
    Keyboard,
    Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';
import { AuthStackParamList, MainStackParamList } from '../navigation/types';

interface RouteParams {
    email: string;
    type: 'registration' | 'password_reset' | 'login';
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

// OTP Screen needs access to both Auth stack (for ResetPassword) and Main stack (for Home)
type OTPVerificationScreenNavigationProp = StackNavigationProp<AuthStackParamList & MainStackParamList, 'OTPVerification' | 'Home' | 'ResetPassword'>;

export const OTPVerificationScreen: React.FC = () => {
    const navigation = useNavigation<OTPVerificationScreenNavigationProp>();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { email, type } = (route.params as RouteParams) || { email: '', type: 'registration' };
    const { verifyLoginOTP } = useAuthStore();

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    useEffect(() => {
        // Auto-focus first input
        inputRefs.current[0]?.focus();
    }, []);

    useEffect(() => {
        // Countdown timer for resend
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleOtpChange = (value: string, index: number) => {
        // Only allow numbers
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all digits entered
        if (value && index === OTP_LENGTH - 1 && newOtp.every(d => d !== '')) {
            Keyboard.dismiss();
            handleVerify(newOtp.join(''));
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async (otpCode?: string) => {
        const code = otpCode || otp.join('');

        if (code.length !== OTP_LENGTH) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter the complete OTP' });
            return;
        }

        setLoading(true);
        try {
            if (type === 'registration') {
                await authService.verifyEmail(email, code);
                Toast.show({ type: 'success', text1: 'Email Verified!', text2: 'Your account is now active' });
                // @ts-ignore - navigating to a different stack
                navigation.navigate('Home');
            } else if (type === 'login') {
                // Login OTP verification - this logs the user in
                await verifyLoginOTP(email, code);
                Toast.show({ type: 'success', text1: 'Welcome back!', text2: 'Login successful' });
                // Navigation will happen automatically via auth state change
            } else {
                // Password reset flow - navigate to reset password screen
                navigation.navigate('ResetPassword', { email, otp: code });
            }
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Verification failed';
            Toast.show({ type: 'error', text1: 'Verification Failed', text2: message });
            // Clear OTP on error
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0) return;

        setResendLoading(true);
        try {
            if (type === 'registration' || type === 'login') {
                await authService.resendVerificationOTP(email);
            } else {
                await authService.forgotPassword(email);
            }
            Toast.show({ type: 'success', text1: 'OTP Sent', text2: 'Check your email for the new code' });
            setCountdown(RESEND_COOLDOWN);
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message });
        } finally {
            setResendLoading(false);
        }
    };

    const getTitle = () => {
        return type === 'registration' ? 'Verify Your Email' : 'Enter Reset Code';
    };

    const getSubtitle = () => {
        return `We've sent a ${OTP_LENGTH}-digit code to\n${email}`;
    };

    return (
        <KeyboardAwareScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
            enableAutomaticScroll={true}
        >
            <View style={[styles.content, { paddingTop: insets.top + 10 }]}>
                {/* Back Button */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color="#374151" />
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/images/icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.title}>{getTitle()}</Text>
                    <Text style={styles.subtitle}>{getSubtitle()}</Text>
                </View>

                {/* OTP Input */}
                <Card style={styles.card}>
                    <View style={styles.otpContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => { inputRefs.current[index] = ref; }}
                                style={[
                                    styles.otpInput,
                                    digit && styles.otpInputFilled,
                                ]}
                                value={digit}
                                onChangeText={(value) => handleOtpChange(value, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                keyboardType="number-pad"
                                maxLength={1}
                                selectTextOnFocus
                            />
                        ))}
                    </View>

                    {/* Verify Button */}
                    <Button
                        title="Verify"
                        onPress={() => handleVerify()}
                        loading={loading}
                        disabled={loading || otp.some(d => !d)}
                        style={styles.verifyButton}
                    />

                    {/* Resend */}
                    <View style={styles.resendContainer}>
                        <Text style={styles.resendText}>Didn't receive the code?</Text>
                        {countdown > 0 ? (
                            <Text style={styles.countdownText}>
                                Resend in {countdown}s
                            </Text>
                        ) : (
                            <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
                                <Text style={[styles.resendLink, resendLoading && styles.resendDisabled]}>
                                    {resendLoading ? 'Sending...' : 'Resend Code'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Card>

                {/* Help text */}
                <View style={styles.helpContainer}>
                    <Icon name="information-outline" size={16} color="#9ca3af" />
                    <Text style={styles.helpText}>
                        The code will expire in 10 minutes. Check your spam folder if you don't see the email.
                    </Text>
                </View>
            </View>
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    backButton: {
        marginBottom: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },

    logoContainer: {
        width: 96,
        height: 96,
        marginBottom: 24,
    },
    logo: {
        width: 96,
        height: 96,
        borderRadius: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 22,
    },
    card: {
        padding: 24,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 8,
    },
    otpInput: {
        flex: 1,
        aspectRatio: 1,
        maxWidth: 52,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        color: '#1f2937',
        backgroundColor: '#fff',
    },
    otpInputFilled: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
    },
    verifyButton: {
        marginBottom: 20,
    },
    resendContainer: {
        alignItems: 'center',
    },
    resendText: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    countdownText: {
        fontSize: 14,
        color: '#9ca3af',
        fontWeight: '500',
    },
    resendLink: {
        fontSize: 14,
        color: '#3b82f6',
        fontWeight: '600',
    },
    resendDisabled: {
        color: '#9ca3af',
    },
    helpContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 24,
        backgroundColor: '#f3f4f6',
        padding: 16,
        borderRadius: 12,
        gap: 10,
    },
    helpText: {
        flex: 1,
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 20,
    },
});
