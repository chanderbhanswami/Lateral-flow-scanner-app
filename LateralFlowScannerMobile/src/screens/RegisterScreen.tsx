import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
    Image,
    Modal,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { ENV } from '../config/env';
import { authService } from '../services/auth.service';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { AuthStackParamList } from '../navigation/types';

interface PasswordStrength {
    score: number;
    label: string;
    color: string;
    checks: {
        length: boolean;
        uppercase: boolean;
        lowercase: boolean;
        number: boolean;
        special: boolean;
    };
}

const checkPasswordStrength = (password: string): PasswordStrength => {
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;

    if (score <= 2) return { score, label: 'Weak', color: '#ef4444', checks };
    if (score <= 3) return { score, label: 'Fair', color: '#f59e0b', checks };
    if (score <= 4) return { score, label: 'Good', color: '#10b981', checks };
    return { score, label: 'Strong', color: '#059669', checks };
};

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC = () => {
    const navigation = useNavigation<RegisterScreenNavigationProp>();
    const insets = useSafeAreaInsets();
    const { register, loginWithGoogle, loginWithFacebook } = useAuthStore();

    const [name, setName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [facebookLoading, setFacebookLoading] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>(checkPasswordStrength(''));

    const [showInviteCodePrompt, setShowInviteCodePrompt] = useState(false);
    const [inviteCodeInput, setInviteCodeInput] = useState('');
    const [pendingOAuth, setPendingOAuth] = useState<{ provider: 'google' | 'facebook', token: string } | null>(null);

    useEffect(() => {
        setPasswordStrength(checkPasswordStrength(password));
    }, [password]);

    useEffect(() => {
        // Only enable offlineAccess when webClientId is configured
        const config: any = {};
        if (ENV.GOOGLE_WEB_CLIENT_ID) {
            config.webClientId = ENV.GOOGLE_WEB_CLIENT_ID;
            config.offlineAccess = true;
        }
        GoogleSignin.configure(config);
    }, []);

    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleRegister = async () => {
        // Validation
        if (!name.trim()) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter your name' });
            return;
        }
        if (!email.trim() || !isValidEmail(email)) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter a valid email' });
            return;
        }
        if (passwordStrength.score < 5) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please create a stronger password' });
            return;
        }
        if (password !== confirmPassword) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Passwords do not match' });
            return;
        }
        if (!acceptTerms) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please accept the terms and conditions' });
            return;
        }

        if (!inviteCode.trim()) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter an invite code' });
            return;
        }

        setLoading(true);
        try {
            await register({ email: email.toLowerCase().trim(), password, name: name.trim(), inviteCode: inviteCode.trim() });
            Toast.show({
                type: 'success',
                text1: 'Registration Successful',
                text2: 'Please check your email to verify your account'
            });
            // Navigate to OTP verification
            navigation.navigate('OTPVerification', {
                email: email.toLowerCase().trim(),
                type: 'registration'
            });
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Registration failed';
            Toast.show({ type: 'error', text1: 'Registration Failed', text2: message });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async (retryWithCode?: string) => {
        setGoogleLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();

            if (userInfo.idToken) {
                await loginWithGoogle({
                    idToken: userInfo.idToken,
                    inviteCode: retryWithCode
                });
                Toast.show({ type: 'success', text1: 'Google Sign-Up Successful' });
            } else {
                throw new Error('No ID token obtained from Google');
            }
        } catch (error: any) {
            if (error.code === 'SIGN_IN_CANCELLED') {
                // User cancelled
            } else {
                const errorCode = error?.response?.data?.code;
                const errorMessage = error?.response?.data?.message || error.message;

                if (errorCode === 'INVALID_INVITE_CODE' || (error.response && error.response.status === 403)) {
                    setShowInviteCodePrompt(true);
                    setPendingOAuth({ provider: 'google', token: '' });
                } else {
                    Toast.show({ type: 'error', text1: 'Google Sign-Up Failed', text2: errorMessage });
                }
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleFacebookSignup = async (retryWithCode?: string) => {
        setFacebookLoading(true);
        try {
            const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

            if (result.isCancelled) {
                return;
            }

            const data = await AccessToken.getCurrentAccessToken();
            if (!data) {
                throw new Error('Something went wrong obtaining access token');
            }

            await loginWithFacebook({
                accessToken: data.accessToken.toString(),
                inviteCode: retryWithCode
            });
            Toast.show({ type: 'success', text1: 'Facebook Sign-Up Successful' });
        } catch (error: any) {
            const errorCode = error?.response?.data?.code;
            const errorMessage = error?.response?.data?.message || error.message;

            if (errorCode === 'INVALID_INVITE_CODE' || (error.response && error.response.status === 403)) {
                setShowInviteCodePrompt(true);
                setPendingOAuth({ provider: 'facebook', token: '' });
            } else {
                Toast.show({ type: 'error', text1: 'Facebook Sign-Up Failed', text2: errorMessage });
            }
        } finally {
            setFacebookLoading(false);
        }
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
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-left" size={24} color="#374151" />
                    </TouchableOpacity>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/images/icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join Lateral Flow Scanner today</Text>
                </View>

                {/* Social Signup */}
                <View style={styles.socialButtons}>
                    <TouchableOpacity
                        style={[styles.socialButton, styles.googleButton]}
                        onPress={() => handleGoogleSignup()}
                        disabled={loading || googleLoading || facebookLoading}
                    >
                        {googleLoading ? (
                            <ActivityIndicator size="small" color="#ea4335" />
                        ) : (
                            <>
                                <Icon name="google" size={20} color="#ea4335" />
                                <Text style={styles.googleText}>Continue with Google</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.socialButton, styles.facebookButton]}
                        onPress={() => handleFacebookSignup()}
                        disabled={loading || googleLoading || facebookLoading}
                    >
                        {facebookLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Icon name="facebook" size={20} color="#fff" />
                                <Text style={styles.facebookText}>Continue with Facebook</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or register with email</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Registration Form */}
                <Card style={styles.card}>
                    {/* Name */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Full Name</Text>
                        <View style={styles.inputContainer}>
                            <Icon name="account-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your full name"
                                placeholderTextColor="#9ca3af"
                                autoCapitalize="words"
                                autoComplete="name"
                            />
                        </View>
                    </View>

                    {/* Invite Code */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Invite Code</Text>
                        <View style={styles.inputContainer}>
                            <Icon name="ticket-confirmation-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={inviteCode}
                                onChangeText={setInviteCode}
                                placeholder="Enter your invite code"
                                placeholderTextColor="#9ca3af"
                                autoCapitalize="characters"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    {/* Email */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Email</Text>
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
                        </View>
                    </View>

                    {/* Password */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputContainer}>
                            <Icon name="lock-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Create password"
                                placeholderTextColor="#9ca3af"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggle}>
                                <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        {/* Password Strength Indicator */}
                        {password.length > 0 && (
                            <View style={styles.strengthContainer}>
                                <View style={styles.strengthBar}>
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.strengthSegment,
                                                { backgroundColor: i <= passwordStrength.score ? passwordStrength.color : '#e5e7eb' },
                                            ]}
                                        />
                                    ))}
                                </View>
                                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                                    {passwordStrength.label}
                                </Text>
                            </View>
                        )}

                        {/* Password Requirements */}
                        {password.length > 0 && (
                            <View style={styles.requirements}>
                                <View style={styles.requirementRow}>
                                    <Icon
                                        name={passwordStrength.checks.length ? 'check-circle' : 'circle-outline'}
                                        size={14}
                                        color={passwordStrength.checks.length ? '#10b981' : '#9ca3af'}
                                    />
                                    <Text style={[styles.requirementText, passwordStrength.checks.length && styles.requirementMet]}>
                                        At least 8 characters
                                    </Text>
                                </View>
                                <View style={styles.requirementRow}>
                                    <Icon
                                        name={passwordStrength.checks.uppercase ? 'check-circle' : 'circle-outline'}
                                        size={14}
                                        color={passwordStrength.checks.uppercase ? '#10b981' : '#9ca3af'}
                                    />
                                    <Text style={[styles.requirementText, passwordStrength.checks.uppercase && styles.requirementMet]}>
                                        One uppercase letter
                                    </Text>
                                </View>
                                <View style={styles.requirementRow}>
                                    <Icon
                                        name={passwordStrength.checks.lowercase ? 'check-circle' : 'circle-outline'}
                                        size={14}
                                        color={passwordStrength.checks.lowercase ? '#10b981' : '#9ca3af'}
                                    />
                                    <Text style={[styles.requirementText, passwordStrength.checks.lowercase && styles.requirementMet]}>
                                        One lowercase letter
                                    </Text>
                                </View>
                                <View style={styles.requirementRow}>
                                    <Icon
                                        name={passwordStrength.checks.number ? 'check-circle' : 'circle-outline'}
                                        size={14}
                                        color={passwordStrength.checks.number ? '#10b981' : '#9ca3af'}
                                    />
                                    <Text style={[styles.requirementText, passwordStrength.checks.number && styles.requirementMet]}>
                                        One number
                                    </Text>
                                </View>
                                <View style={styles.requirementRow}>
                                    <Icon
                                        name={passwordStrength.checks.special ? 'check-circle' : 'circle-outline'}
                                        size={14}
                                        color={passwordStrength.checks.special ? '#10b981' : '#9ca3af'}
                                    />
                                    <Text style={[styles.requirementText, passwordStrength.checks.special && styles.requirementMet]}>
                                        One special character
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Confirm Password */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={[
                            styles.inputContainer,
                            confirmPassword && password !== confirmPassword && styles.inputError
                        ]}>
                            <Icon name="lock-check-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Confirm your password"
                                placeholderTextColor="#9ca3af"
                                secureTextEntry={!showConfirmPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.passwordToggle}>
                                <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                        {confirmPassword && password !== confirmPassword && (
                            <Text style={styles.errorText}>Passwords do not match</Text>
                        )}
                    </View>

                    {/* Terms */}
                    <TouchableOpacity
                        style={styles.termsContainer}
                        onPress={() => setAcceptTerms(!acceptTerms)}
                    >
                        <Icon
                            name={acceptTerms ? 'checkbox-marked' : 'checkbox-blank-outline'}
                            size={22}
                            color={acceptTerms ? '#3b82f6' : '#9ca3af'}
                        />
                        <Text style={styles.termsText}>
                            I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                            <Text style={styles.termsLink}>Privacy Policy</Text>
                        </Text>
                    </TouchableOpacity>

                    {/* Register Button */}
                    <Button
                        title="Create Account"
                        onPress={handleRegister}
                        loading={loading}
                        disabled={loading || googleLoading || facebookLoading}
                        style={styles.registerButton}
                    />
                </Card>

                {/* Login Link */}
                <TouchableOpacity
                    style={styles.loginLink}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.loginText}>
                        Already have an account?{' '}
                        <Text style={styles.loginTextBold}>Sign In</Text>
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Invite Code Prompt Modal */}
            <Modal
                visible={showInviteCodePrompt}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    setShowInviteCodePrompt(false);
                    setPendingOAuth(null);
                    setInviteCodeInput('');
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Invite Code Required</Text>
                        <Text style={styles.modalSubtitle}>
                            Please enter your invite code to complete registration.
                        </Text>

                        <TextInput
                            style={styles.modalInput}
                            value={inviteCodeInput}
                            onChangeText={setInviteCodeInput}
                            placeholder="Enter Invite Code"
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setShowInviteCodePrompt(false);
                                    setPendingOAuth(null);
                                    setInviteCodeInput('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={() => {
                                    if (!inviteCodeInput.trim()) {
                                        Toast.show({ type: 'error', text1: 'Required', text2: 'Please enter a code' });
                                        return;
                                    }
                                    setShowInviteCodePrompt(false);

                                    if (pendingOAuth?.provider === 'google') {
                                        handleGoogleSignup(inviteCodeInput.trim());
                                    } else if (pendingOAuth?.provider === 'facebook') {
                                        handleFacebookSignup(inviteCodeInput.trim());
                                    }
                                    setPendingOAuth(null);
                                    setInviteCodeInput('');
                                }}
                            >
                                <Text style={styles.submitButtonText}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    scrollContent: { flexGrow: 1 },
    content: { flex: 1, padding: 20 },
    header: { marginBottom: 24, alignItems: 'center' },
    backButton: { marginBottom: 16, alignSelf: 'flex-start' },
    logoContainer: { width: 80, height: 80, marginBottom: 16 },
    logo: { width: 80, height: 80, borderRadius: 20 },
    title: { fontSize: 28, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
    subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
    socialButtons: { gap: 12, marginBottom: 20 },
    socialButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 10 },
    googleButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
    googleText: { color: '#374151', fontWeight: '600', fontSize: 15 },
    facebookButton: { backgroundColor: '#1877f2' },
    facebookText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
    dividerText: { marginHorizontal: 16, color: '#9ca3af', fontSize: 13 },
    card: { padding: 20, marginBottom: 16 },
    field: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fff' },
    inputError: { borderColor: '#ef4444' },
    inputIcon: { paddingLeft: 14 },
    input: { flex: 1, padding: 14, fontSize: 16, color: '#1f2937' },
    passwordToggle: { padding: 14 },
    strengthContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    strengthBar: { flexDirection: 'row', flex: 1, gap: 4 },
    strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
    strengthLabel: { marginLeft: 10, fontSize: 12, fontWeight: '600' },
    requirements: { marginTop: 12, gap: 6 },
    requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    requirementText: { fontSize: 12, color: '#9ca3af' },
    requirementMet: { color: '#10b981' },
    errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
    termsContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 10 },
    termsText: { flex: 1, fontSize: 13, color: '#6b7280', lineHeight: 20 },
    termsLink: { color: '#3b82f6', fontWeight: '500' },
    registerButton: { marginTop: 4 },
    loginLink: { alignItems: 'center', paddingBottom: 20 },
    loginText: { color: '#6b7280', fontSize: 15 },
    loginTextBold: { color: '#3b82f6', fontWeight: '600' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1f2937',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalInput: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#1f2937',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f3f4f6',
    },
    cancelButtonText: {
        color: '#4b5563',
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: '#3b82f6',
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});