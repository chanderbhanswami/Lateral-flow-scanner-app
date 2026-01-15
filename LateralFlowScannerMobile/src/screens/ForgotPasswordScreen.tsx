import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    Platform,
    Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { authService } from '../services/auth.service';
import { AuthStackParamList } from '../navigation/types';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC = () => {
    const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
    const insets = useSafeAreaInsets();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleSendResetLink = async () => {
        if (!email.trim()) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter your email' });
            return;
        }
        if (!isValidEmail(email)) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter a valid email' });
            return;
        }

        setLoading(true);
        try {
            await authService.forgotPassword(email.toLowerCase().trim());
            setSent(true);
            Toast.show({
                type: 'success',
                text1: 'Email Sent',
                text2: 'Check your inbox for reset instructions'
            });
        } catch (error: any) {
            // Don't reveal if email exists or not for security
            setSent(true);
            Toast.show({
                type: 'success',
                text1: 'Email Sent',
                text2: 'If this email exists, you will receive reset instructions'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleContinueToOTP = () => {
        navigation.navigate('OTPVerification', {
            email: email.toLowerCase().trim(),
            type: 'password_reset'
        });
    };

    if (sent) {
        return (
            <View style={styles.container}>
                <View style={[styles.content, { paddingTop: insets.top + 10 }]}>
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-left" size={24} color="#374151" />
                    </TouchableOpacity>

                    {/* Success State */}
                    <View style={styles.successContainer}>
                        <View style={styles.successIcon}>
                            <Icon name="email-check-outline" size={64} color="#10b981" />
                        </View>
                        <Text style={styles.successTitle}>Check Your Email</Text>
                        <Text style={styles.successSubtitle}>
                            We've sent password reset instructions to:
                        </Text>
                        <Text style={styles.emailText}>{email}</Text>

                        <Card style={styles.instructionsCard}>
                            <Text style={styles.instructionsTitle}>What to do next:</Text>
                            <View style={styles.instructionRow}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>1</Text>
                                </View>
                                <Text style={styles.instructionText}>Check your email inbox (and spam folder)</Text>
                            </View>
                            <View style={styles.instructionRow}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>2</Text>
                                </View>
                                <Text style={styles.instructionText}>Find the 6-digit verification code</Text>
                            </View>
                            <View style={styles.instructionRow}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>3</Text>
                                </View>
                                <Text style={styles.instructionText}>Enter the code to reset your password</Text>
                            </View>
                        </Card>

                        <Button
                            title="Enter Verification Code"
                            onPress={handleContinueToOTP}
                            style={styles.continueButton}
                        />

                        <TouchableOpacity
                            style={styles.resendContainer}
                            onPress={() => setSent(false)}
                        >
                            <Text style={styles.resendText}>
                                Didn't receive the email?{' '}
                                <Text style={styles.resendLink}>Try again</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

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
                    <Text style={styles.title}>Forgot Password?</Text>
                    <Text style={styles.subtitle}>
                        No worries! Enter your email address and we'll send you a verification code to reset your password.
                    </Text>
                </View>

                {/* Form */}
                <Card style={styles.card}>
                    <View style={styles.field}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.inputContainer}>
                            <Icon name="email-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                placeholderTextColor="#9ca3af"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="email"
                            />
                            {email && isValidEmail(email) && (
                                <Icon name="check-circle" size={20} color="#10b981" style={styles.validIcon} />
                            )}
                        </View>
                    </View>

                    <Button
                        title="Send Reset Code"
                        onPress={handleSendResetLink}
                        loading={loading}
                        disabled={loading || !email.trim()}
                        style={styles.sendButton}
                    />
                </Card>

                {/* Back to Login */}
                <TouchableOpacity
                    style={styles.loginLink}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={16} color="#3b82f6" />
                    <Text style={styles.loginLinkText}>Back to Sign In</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    scrollContent: { flexGrow: 1 },
    content: { flex: 1, padding: 20 },
    backButton: { marginBottom: 24 },

    // Header
    header: { alignItems: 'center', marginBottom: 32 },
    logoContainer: { width: 96, height: 96, marginBottom: 24 },
    logo: { width: 96, height: 96, borderRadius: 24 },
    title: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginBottom: 12, textAlign: 'center' },
    subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },

    // Card
    card: { padding: 24 },
    field: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fff' },
    inputIcon: { paddingLeft: 14 },
    input: { flex: 1, padding: 14, fontSize: 16, color: '#1f2937' },
    validIcon: { paddingRight: 14 },
    sendButton: { marginTop: 8 },

    // Login Link
    loginLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 6 },
    loginLinkText: { color: '#3b82f6', fontSize: 15, fontWeight: '500' },

    // Success State
    successContainer: { flex: 1, alignItems: 'center', paddingTop: 20 },
    successIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    successTitle: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
    successSubtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 8 },
    emailText: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 24 },

    // Instructions Card
    instructionsCard: { padding: 20, width: '100%', marginBottom: 24 },
    instructionsTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 16 },
    instructionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
    stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
    stepNumberText: { fontSize: 12, fontWeight: '700', color: '#3b82f6' },
    instructionText: { flex: 1, fontSize: 14, color: '#4b5563' },

    continueButton: { width: '100%', marginBottom: 16 },
    resendContainer: { marginTop: 8 },
    resendText: { fontSize: 14, color: '#6b7280' },
    resendLink: { color: '#3b82f6', fontWeight: '500' },
});