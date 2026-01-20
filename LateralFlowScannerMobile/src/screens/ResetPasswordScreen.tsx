import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { authService } from '../services/auth.service';
import { AuthStackParamList } from '../navigation/types';
import { moderateScale, verticalScale } from '../utils/responsive';

type ResetPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordScreenRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

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

export const ResetPasswordScreen: React.FC = () => {
    const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
    const route = useRoute<ResetPasswordScreenRouteProp>();
    const insets = useSafeAreaInsets();
    const { email, token, otp } = route.params || {};

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>(checkPasswordStrength(''));

    useEffect(() => {
        setPasswordStrength(checkPasswordStrength(password));
    }, [password]);

    const handleResetPassword = async () => {
        // Validation
        if (passwordStrength.score < 5) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please create a stronger password' });
            return;
        }
        if (password !== confirmPassword) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Passwords do not match' });
            return;
        }

        setLoading(true);
        try {
            if (token) {
                await authService.resetPassword(token, password);
            } else if (email && otp) {
                // Reset with OTP
                await authService.resetPassword(otp, password);
            } else {
                throw new Error('Missing reset token or OTP');
            }

            Toast.show({
                type: 'success',
                text1: 'Password Reset Successful',
                text2: 'You can now login with your new password'
            });
            navigation.navigate('Login');
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Password reset failed';
            Toast.show({ type: 'error', text1: 'Error', text2: message });
        } finally {
            setLoading(false);
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
                    <Text style={styles.title}>Create New Password</Text>
                    <Text style={styles.subtitle}>
                        Your new password must be different from your previous password
                    </Text>
                </View>

                {/* Form */}
                <Card style={styles.card}>
                    {/* New Password */}
                    <View style={styles.field}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.inputContainer}>
                            <Icon name="lock-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter new password"
                                placeholderTextColor="#9ca3af"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggle}>
                                <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        {/* Password Strength */}
                        {password.length > 0 && (
                            <>
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

                                <View style={styles.requirements}>
                                    {[
                                        { key: 'length', text: 'At least 8 characters' },
                                        { key: 'uppercase', text: 'One uppercase letter' },
                                        { key: 'lowercase', text: 'One lowercase letter' },
                                        { key: 'number', text: 'One number' },
                                        { key: 'special', text: 'One special character' },
                                    ].map(({ key, text }) => (
                                        <View key={key} style={styles.requirementRow}>
                                            <Icon
                                                name={passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? 'check-circle' : 'circle-outline'}
                                                size={14}
                                                color={passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? '#10b981' : '#9ca3af'}
                                            />
                                            <Text style={[
                                                styles.requirementText,
                                                passwordStrength.checks[key as keyof typeof passwordStrength.checks] && styles.requirementMet
                                            ]}>
                                                {text}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </>
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
                                placeholder="Confirm new password"
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
                        {confirmPassword && password === confirmPassword && password.length > 0 && (
                            <View style={styles.matchContainer}>
                                <Icon name="check-circle" size={14} color="#10b981" />
                                <Text style={styles.matchText}>Passwords match</Text>
                            </View>
                        )}
                    </View>

                    {/* Reset Button */}
                    <Button
                        title="Reset Password"
                        onPress={handleResetPassword}
                        loading={loading}
                        disabled={loading || passwordStrength.score < 5 || password !== confirmPassword}
                        style={styles.resetButton}
                    />
                </Card>
            </View>
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    scrollContent: { flexGrow: 1 },
    content: { flex: 1, padding: moderateScale(20) },
    backButton: { marginBottom: verticalScale(24) },
    header: { alignItems: 'center', marginBottom: verticalScale(32) },

    logoContainer: { width: moderateScale(96), height: moderateScale(96), marginBottom: verticalScale(24) },
    logo: { width: moderateScale(96), height: moderateScale(96), borderRadius: moderateScale(24) },
    title: { fontSize: moderateScale(24), fontWeight: '700', color: '#1f2937', marginBottom: verticalScale(12), textAlign: 'center' },
    subtitle: { fontSize: moderateScale(15), color: '#6b7280', textAlign: 'center', lineHeight: moderateScale(22) },
    card: { padding: moderateScale(24) },
    field: { marginBottom: verticalScale(20) },
    label: { fontSize: moderateScale(14), fontWeight: '600', color: '#374151', marginBottom: verticalScale(8) },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: moderateScale(12), backgroundColor: '#fff', height: verticalScale(48) },
    inputError: { borderColor: '#ef4444' },
    inputIcon: { paddingLeft: moderateScale(14) },
    input: { flex: 1, paddingHorizontal: moderateScale(14), fontSize: moderateScale(16), color: '#1f2937', height: '100%' },
    passwordToggle: { padding: moderateScale(14) },
    strengthContainer: { flexDirection: 'row', alignItems: 'center', marginTop: verticalScale(8) },
    strengthBar: { flexDirection: 'row', flex: 1, gap: 4 },
    strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
    strengthLabel: { marginLeft: moderateScale(10), fontSize: moderateScale(12), fontWeight: '600' },
    requirements: { marginTop: verticalScale(12), gap: 6 },
    requirementRow: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8) },
    requirementText: { fontSize: moderateScale(12), color: '#9ca3af' },
    requirementMet: { color: '#10b981' },
    errorText: { color: '#ef4444', fontSize: moderateScale(12), marginTop: verticalScale(4) },
    matchContainer: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(6), marginTop: verticalScale(4) },
    matchText: { color: '#10b981', fontSize: moderateScale(12) },
    resetButton: { marginTop: verticalScale(8) },
});
