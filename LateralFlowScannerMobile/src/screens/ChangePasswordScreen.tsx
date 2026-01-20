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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { authService } from '../services/auth.service';
import { MainStackParamList } from '../navigation/types';
import { moderateScale, verticalScale, scale } from '../utils/responsive';

type ChangePasswordScreenNavigationProp = StackNavigationProp<MainStackParamList, 'ChangePassword'>;

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

export const ChangePasswordScreen: React.FC = () => {
    const navigation = useNavigation<ChangePasswordScreenNavigationProp>();
    const insets = useSafeAreaInsets();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>(checkPasswordStrength(''));

    useEffect(() => {
        setPasswordStrength(checkPasswordStrength(newPassword));
    }, [newPassword]);

    const handleChangePassword = async () => {
        // Validation
        if (!currentPassword) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter your current password' });
            return;
        }
        if (passwordStrength.score < 5) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please create a stronger password' });
            return;
        }
        if (newPassword !== confirmPassword) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Passwords do not match' });
            return;
        }
        if (currentPassword === newPassword) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'New password must be different from current password' });
            return;
        }

        setLoading(true);
        try {
            await authService.changePassword(currentPassword, newPassword);
            Toast.show({
                type: 'success',
                text1: 'Password Changed',
                text2: 'Your password has been updated successfully'
            });
            navigation.goBack();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Password change failed';
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
                    <Text style={styles.title}>Change Password</Text>
                    <Text style={styles.subtitle}>
                        Update your password to keep your account secure
                    </Text>
                </View>

                {/* Form */}
                <Card style={styles.card}>
                    {/* Current Password */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Current Password</Text>
                        <View style={styles.inputContainer}>
                            <Icon name="lock-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholder="Enter current password"
                                placeholderTextColor="#9ca3af"
                                secureTextEntry={!showCurrentPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.passwordToggle}>
                                <Icon name={showCurrentPassword ? 'eye-off' : 'eye'} size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* New Password */}
                    <View style={styles.field}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.inputContainer}>
                            <Icon name="lock-plus-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="Enter new password"
                                placeholderTextColor="#9ca3af"
                                secureTextEntry={!showNewPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.passwordToggle}>
                                <Icon name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        {/* Password Strength */}
                        {newPassword.length > 0 && (
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
                        <Text style={styles.label}>Confirm New Password</Text>
                        <View style={[
                            styles.inputContainer,
                            confirmPassword && newPassword !== confirmPassword && styles.inputError
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
                        {confirmPassword && newPassword !== confirmPassword && (
                            <Text style={styles.errorText}>Passwords do not match</Text>
                        )}
                    </View>

                    {/* Submit Button */}
                    <Button
                        title="Update Password"
                        onPress={handleChangePassword}
                        loading={loading}
                        disabled={loading || !currentPassword || passwordStrength.score < 5 || newPassword !== confirmPassword}
                        style={styles.submitButton}
                    />
                </Card>

                {/* Security Note */}
                <View style={styles.securityNote}>
                    <Icon name="shield-check" size={20} color="#3b82f6" />
                    <Text style={styles.securityNoteText}>
                        For security, you'll be asked to sign in again after changing your password.
                    </Text>
                </View>
            </View>
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    scrollContent: { flexGrow: 1 },
    content: { flex: 1, padding: moderateScale(20) },
    header: { marginBottom: verticalScale(24), alignItems: 'center' },
    backButton: { marginBottom: verticalScale(16), alignSelf: 'flex-start' },
    logoContainer: { width: moderateScale(80), height: moderateScale(80), marginBottom: verticalScale(16) },
    logo: { width: moderateScale(80), height: moderateScale(80), borderRadius: moderateScale(20) },
    title: { fontSize: moderateScale(24), fontWeight: '700', color: '#1f2937', marginBottom: verticalScale(8) },
    subtitle: { fontSize: moderateScale(15), color: '#6b7280' },
    card: { padding: moderateScale(20) },
    field: { marginBottom: verticalScale(20) },
    label: { fontSize: moderateScale(14), fontWeight: '600', color: '#374151', marginBottom: verticalScale(8) },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: moderateScale(12), backgroundColor: '#fff' },
    inputError: { borderColor: '#ef4444' },
    inputIcon: { paddingLeft: moderateScale(14) },
    input: { flex: 1, padding: moderateScale(14), fontSize: moderateScale(16), color: '#1f2937' },
    passwordToggle: { padding: moderateScale(14) },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: verticalScale(16) },
    strengthContainer: { flexDirection: 'row', alignItems: 'center', marginTop: verticalScale(8) },
    strengthBar: { flexDirection: 'row', flex: 1, gap: moderateScale(4) },
    strengthSegment: { flex: 1, height: verticalScale(4), borderRadius: moderateScale(2) },
    strengthLabel: { marginLeft: moderateScale(10), fontSize: moderateScale(12), fontWeight: '600' },
    requirements: { marginTop: verticalScale(12), gap: verticalScale(6) },
    requirementRow: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8) },
    requirementText: { fontSize: moderateScale(12), color: '#9ca3af' },
    requirementMet: { color: '#10b981' },
    errorText: { color: '#ef4444', fontSize: moderateScale(12), marginTop: verticalScale(4) },
    submitButton: { marginTop: verticalScale(8) },
    securityNote: { flexDirection: 'row', alignItems: 'flex-start', marginTop: verticalScale(20), padding: moderateScale(16), backgroundColor: '#eff6ff', borderRadius: moderateScale(12), gap: moderateScale(12) },
    securityNoteText: { flex: 1, fontSize: moderateScale(13), color: '#1d4ed8', lineHeight: moderateScale(20) },
});
