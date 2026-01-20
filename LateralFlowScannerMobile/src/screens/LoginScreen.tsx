import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    Platform,
    Image,
    ActivityIndicator,
    Modal,
    Dimensions,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { ENV } from '../config/env';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { authService } from '../services/auth.service';
import { AuthStackParamList } from '../navigation/types';
import { moderateScale, scale, verticalScale } from '../utils/responsive';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
    const navigation = useNavigation<LoginScreenNavigationProp>();
    const { login, verifyLoginOTP, loginWithGoogle, loginWithFacebook, setUser, setTokens } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [facebookLoading, setFacebookLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // OTP State (removed modal approach - using navigation instead)
    const [showInviteCodePrompt, setShowInviteCodePrompt] = useState(false);
    const [inviteCodeInput, setInviteCodeInput] = useState('');
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [pendingOAuth, setPendingOAuth] = useState<{ provider: 'google' | 'facebook', token: string } | null>(null);

    React.useEffect(() => {
        // Only enable offlineAccess when webClientId is configured
        const config: any = {};
        if (ENV.GOOGLE_WEB_CLIENT_ID) {
            config.webClientId = ENV.GOOGLE_WEB_CLIENT_ID;
            config.offlineAccess = false; // We need idToken, not serverAuthCode
        }
        GoogleSignin.configure(config);
    }, []);

    // Email validation
    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleLogin = async () => {
        // Validation
        if (!email.trim()) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter your email' });
            return;
        }
        if (!isValidEmail(email)) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter a valid email' });
            return;
        }
        if (!password) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter your password' });
            return;
        }

        setLoading(true);
        try {
            const result = await login({ email: email.toLowerCase().trim(), password });

            // Check if OTP verification is required
            if (result.requiresOTP) {
                // Navigate to OTP verification screen
                navigation.navigate('OTPVerification', {
                    email: email.toLowerCase().trim(),
                    type: 'login'
                });
                Toast.show({ type: 'info', text1: 'OTP Sent', text2: 'Please check your email for verification code' });
            } else {
                Toast.show({ type: 'success', text1: 'Welcome back!' });
            }
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Login failed';
            Toast.show({ type: 'error', text1: 'Login Failed', text2: message });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async (retryWithCode?: string) => {
        setGoogleLoading(true);
        try {
            await GoogleSignin.hasPlayServices();

            // Sign out first to clear any cached session and allow account selection
            await GoogleSignin.signOut();

            // Request fresh sign-in (works for both initial and invite code retry)
            const userInfo = await GoogleSignin.signIn();

            if (userInfo.idToken) {
                await loginWithGoogle({
                    idToken: userInfo.idToken,
                    inviteCode: retryWithCode
                });
                Toast.show({ type: 'success', text1: 'Google Sign-In Successful' });
            } else {
                throw new Error('No ID token obtained from Google');
            }
        } catch (error: any) {
            if (error.code === 'SIGN_IN_CANCELLED') {
                // User cancelled
            } else {
                // Check if it's the invite code error
                const errorCode = error?.response?.data?.code;
                const errorMessage = error?.response?.data?.message || error.message;

                if (errorCode === 'INVALID_INVITE_CODE' || (error.response && error.response.status === 403)) {
                    // Need to prompt for invite code
                    // Since Alert.prompt is iOS only mostly (or specific Android versions), best to use a Modal or simple logic?
                    // React Native's Alert.prompt works on iOS but not Android.
                    // On Android we should show a specific modal or use a library.
                    // Given the context, I'll use a simple workaround assuming Alert.prompt might not work cross-platform.
                    // But wait, the user instructions implied standard prompting.
                    // I will implement a custom simple prompt using state if needed, but for now let's use a workaround 
                    // OR better: Assume I need to add a small UI for it?
                    // I'll stick to Alert.prompt and if it fails (on Android), I'll fall back to a Toast asking them to registering via email?
                    // No, "Alert.prompt" is iOS only.
                    // I will inject a "showInviteCodePrompt" state to show a simple modal.
                    setShowInviteCodePrompt(true);
                    setPendingOAuth({ provider: 'google', token: '' });
                } else {
                    Toast.show({ type: 'error', text1: 'Google Login Failed', text2: errorMessage });
                }
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleFacebookLogin = async (retryWithCode?: string) => {
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
            Toast.show({ type: 'success', text1: 'Facebook Sign-In Successful' });
        } catch (error: any) {
            const errorCode = error?.response?.data?.code;
            const errorMessage = error?.response?.data?.message || error.message;

            if (errorCode === 'INVALID_INVITE_CODE' || (error.response && error.response.status === 403)) {
                setShowInviteCodePrompt(true);
                setPendingOAuth({ provider: 'facebook', token: '' }); // We re-request token on retry currently
            } else {
                Toast.show({ type: 'error', text1: 'Facebook Login Failed', text2: errorMessage });
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
            extraScrollHeight={Platform.OS === 'ios' ? verticalScale(20) : verticalScale(100)}
            enableAutomaticScroll={true}
        >
            <View style={styles.content}>
                {/* Logo / Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/images/icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to continue to Lateral Flow Scanner</Text>
                </View>

                {/* Login Form */}
                <Card style={styles.card}>
                    {/* Email Input */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Email</Text>
                        <View style={[
                            styles.inputContainer,
                            focusedField === 'email' && styles.inputContainerFocused
                        ]}>
                            <Icon name="email-outline" size={20} color={focusedField === 'email' ? '#3b82f6' : '#9ca3af'} style={styles.inputIcon} />
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
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>
                    </View>

                    {/* Password Input */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Password</Text>
                        <View style={[
                            styles.inputContainer,
                            focusedField === 'password' && styles.inputContainerFocused
                        ]}>
                            <Icon name="lock-outline" size={20} color={focusedField === 'password' ? '#3b82f6' : '#9ca3af'} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter your password"
                                placeholderTextColor="#9ca3af"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoComplete="password"
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.passwordToggle}
                            >
                                <Icon
                                    name={showPassword ? 'eye-off' : 'eye'}
                                    size={20}
                                    color="#9ca3af"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Remember Me & Forgot Password */}
                    <View style={styles.optionsRow}>
                        <TouchableOpacity
                            style={styles.rememberMe}
                            onPress={() => setRememberMe(!rememberMe)}
                        >
                            <Icon
                                name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                size={20}
                                color={rememberMe ? '#3b82f6' : '#9ca3af'}
                            />
                            <Text style={styles.rememberMeText}>Remember me</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('ForgotPassword')}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Login Button */}
                    <Button
                        title="Sign In"
                        onPress={handleLogin}
                        loading={loading}
                        disabled={loading || googleLoading || facebookLoading}
                        style={styles.loginButton}
                    />

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or continue with</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Social Login Buttons */}
                    <View style={styles.socialButtons}>
                        <TouchableOpacity
                            style={[styles.socialButton, styles.googleButton]}
                            onPress={() => handleGoogleLogin()}
                            disabled={loading || googleLoading || facebookLoading}
                        >
                            {googleLoading ? (
                                <ActivityIndicator size="small" color="#ea4335" />
                            ) : (
                                <>
                                    <Icon name="google" size={20} color="#ea4335" />
                                    <Text style={styles.googleButtonText}>Google</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.socialButton, styles.facebookButton]}
                            onPress={() => handleFacebookLogin()}
                            disabled={loading || googleLoading || facebookLoading}
                        >
                            {facebookLoading ? (
                                <ActivityIndicator size="small" color="#1877f2" />
                            ) : (
                                <>
                                    <Icon name="facebook" size={20} color="#1877f2" />
                                    <Text style={styles.facebookButtonText}>Facebook</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </Card>

                {/* Register Link */}
                <TouchableOpacity
                    style={styles.registerLink}
                    onPress={() => navigation.navigate('Register')}
                >
                    <Text style={styles.registerText}>
                        Don't have an account?{' '}
                        <Text style={styles.registerTextBold}>Sign Up</Text>
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
                            style={[
                                styles.modalInput,
                                inviteError ? styles.modalInputError : null,
                                focusedField === 'modalInvite' && styles.modalInputFocused
                            ]}
                            value={inviteCodeInput}
                            onChangeText={(text) => {
                                setInviteCodeInput(text.replace(/\s/g, '').toUpperCase());
                                setInviteError(null);
                            }}
                            placeholder="INVITE-CODE"
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="characters"
                            autoCorrect={false}
                            textAlign="center"
                            onFocus={() => setFocusedField('modalInvite')}
                            onBlur={() => setFocusedField(null)}
                        />

                        {inviteError && (
                            <Text style={styles.modalErrorText}>{inviteError}</Text>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setShowInviteCodePrompt(false);
                                    setPendingOAuth(null);
                                    setInviteCodeInput('');
                                    setInviteError(null);
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={() => {
                                    if (!inviteCodeInput.trim()) {
                                        setInviteError('Please enter a code');
                                        return;
                                    }

                                    setShowInviteCodePrompt(false);

                                    if (pendingOAuth?.provider === 'google') {
                                        handleGoogleLogin(inviteCodeInput.trim());
                                    } else if (pendingOAuth?.provider === 'facebook') {
                                        handleFacebookLogin(inviteCodeInput.trim());
                                    }
                                    setPendingOAuth(null);
                                    setInviteCodeInput('');
                                    setInviteError(null);
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
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: moderateScale(20),
        justifyContent: 'center',
    },
    header: {
        marginBottom: verticalScale(32),
        alignItems: 'center',
    },
    logoContainer: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(20),
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(16),
    },
    logo: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(20),
    },
    title: {
        fontSize: moderateScale(24), // Reduced from 28
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: verticalScale(8),
    },
    subtitle: {
        fontSize: moderateScale(14), // Reduced from 15
        color: '#6b7280',
        textAlign: 'center',
    },
    card: {
        padding: moderateScale(20), // Reduced form 24
    },
    field: {
        marginBottom: verticalScale(16),
    },
    label: {
        fontSize: moderateScale(13), // Reduced from 14
        fontWeight: '600',
        color: '#374151',
        marginBottom: verticalScale(6),
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: moderateScale(12),
        backgroundColor: '#fff',
        height: verticalScale(48), // Explicit height for control
    },
    inputContainerFocused: {
        borderColor: '#3b82f6',
        borderWidth: 1.5,
    },
    inputIcon: {
        paddingLeft: moderateScale(14),
    },
    input: {
        flex: 1,
        paddingHorizontal: moderateScale(12),
        fontSize: moderateScale(15), // Reduced from 16
        color: '#1f2937',
        height: '100%', // Ensure it fills container
    },
    passwordToggle: {
        padding: moderateScale(14),
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(20),
    },
    rememberMe: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rememberMeText: {
        marginLeft: moderateScale(8),
        fontSize: moderateScale(13),
        color: '#6b7280',
    },
    forgotPasswordText: {
        color: '#3b82f6',
        fontSize: moderateScale(13),
        fontWeight: '500',
    },
    loginButton: {
        marginBottom: verticalScale(20),
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: verticalScale(16),
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e5e7eb',
    },
    dividerText: {
        marginHorizontal: moderateScale(16),
        color: '#9ca3af',
        fontSize: moderateScale(13),
    },
    socialButtons: {
        flexDirection: 'row',
        gap: moderateScale(12),
    },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: moderateScale(12),
        borderRadius: moderateScale(12),
        borderWidth: 1,
        gap: moderateScale(8),
        height: verticalScale(48),
    },
    googleButton: {
        borderColor: '#ea4335',
        backgroundColor: '#fff',
    },
    googleButtonText: {
        color: '#ea4335',
        fontWeight: '600',
        fontSize: moderateScale(14),
    },
    facebookButton: {
        borderColor: '#1877f2',
        backgroundColor: '#fff',
    },
    facebookButtonText: {
        color: '#1877f2',
        fontWeight: '600',
        fontSize: moderateScale(14),
    },
    registerLink: {
        alignItems: 'center',
        marginTop: verticalScale(24),
        paddingBottom: verticalScale(20),
    },
    registerText: {
        color: '#6b7280',
        fontSize: moderateScale(14),
    },
    registerTextBold: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: moderateScale(20),
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: moderateScale(16),
        padding: moderateScale(24),
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: moderateScale(20),
        fontWeight: 'bold',
        marginBottom: verticalScale(8),
        color: '#1f2937',
    },
    modalSubtitle: {
        fontSize: moderateScale(14),
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: verticalScale(20),
    },
    modalInput: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: moderateScale(12),
        padding: moderateScale(14),
        fontSize: moderateScale(16),
        color: '#1f2937',
        marginBottom: verticalScale(8),
        textAlign: 'center',
    },
    modalInputFocused: {
        borderColor: '#3b82f6',
        borderWidth: 2,
    },
    modalInputError: {
        borderColor: '#ef4444',
    },
    modalErrorText: {
        color: '#ef4444',
        fontSize: moderateScale(14),
        marginBottom: verticalScale(16),
    },
    modalButtons: {
        flexDirection: 'row',
        gap: moderateScale(12),
        width: '100%',
    },
    modalButton: {
        flex: 1,
        padding: moderateScale(14),
        borderRadius: moderateScale(12),
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