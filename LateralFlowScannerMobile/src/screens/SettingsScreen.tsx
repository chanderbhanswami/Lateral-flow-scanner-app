import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Text, Switch, TouchableOpacity, Image, Animated, Easing, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';

import { useAuthStore } from '../store/authStore';
import { CustomDialog } from '../components/UI/CustomDialog';
import { storageService } from '../services/storage.service';

export const SettingsScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user, logout } = useAuthStore();

    // Settings State
    const [autoCapture, setAutoCapture] = useState(true);
    const [showSensorData, setShowSensorData] = useState(true);
    const [enableVibration, setEnableVibration] = useState(true);
    const [highQualityMode, setHighQualityMode] = useState(true);

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const [dialogConfig, setDialogConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'error';
        onConfirm?: () => void;
        showCancel?: boolean;
        confirmText?: string;
    }>({ visible: false, title: '', message: '', type: 'info' });

    useEffect(() => {
        // Load settings
        const loadSettings = async () => {
            const savedAutoCapture = await storageService.getSetting('autoCapture');
            const savedShowSensorData = await storageService.getSetting('showSensorData');
            const savedEnableVibration = await storageService.getSetting('enableVibration');
            const savedHighQualityMode = await storageService.getSetting('highQualityMode');

            setAutoCapture(savedAutoCapture ?? true);
            setShowSensorData(savedShowSensorData ?? true);
            setEnableVibration(savedEnableVibration ?? true);
            setHighQualityMode(savedHighQualityMode ?? true);
        };
        loadSettings();

        // Entrance Animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
        }).start();
    }, []);

    const handleSettingChange = async (key: string, value: boolean) => {
        await storageService.saveSetting(key, value);
        Toast.show({
            type: 'success',
            text1: 'Saved',
            visibilityTime: 1500,
        });
    };

    const handleLogout = () => {
        setDialogConfig({
            visible: true,
            title: 'Logout',
            message: 'Are you sure you want to log out of your account?',
            type: 'warning',
            showCancel: true,
            confirmText: 'Logout',
            onConfirm: async () => {
                setDialogConfig(prev => ({ ...prev, visible: false }));
                await logout();
            }
        });
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: 'Check out Lateral Flow Scanner! The best app for analyzing rapid tests.',
            });
        } catch (error) {
            console.log(error);
        }
    };

    const handleClearCache = () => {
        setDialogConfig({
            visible: true,
            title: 'Clear Cache',
            message: 'Remove temporary files? This will not delete your scan history.',
            type: 'warning',
            showCancel: true,
            confirmText: 'Clear',
            onConfirm: async () => {
                setDialogConfig(prev => ({ ...prev, visible: false }));
                // Placeholder logic
                Toast.show({ type: 'success', text1: 'Cache cleared successfully' });
            }
        });
    };

    const SectionHeader = ({ title }: { title: string }) => (
        <Text style={styles.sectionTitle}>{title}</Text>
    );

    const SettingItem = ({
        icon,
        color,
        label,
        sublabel,
        isSwitch = false,
        value = false,
        onToggle,
        onPress
    }: {
        icon: string;
        color: string;
        label: string;
        sublabel?: string;
        isSwitch?: boolean;
        value?: boolean;
        onToggle?: (val: boolean) => void;
        onPress?: () => void;
    }) => (
        <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={isSwitch ? 1 : 0.7}
            onPress={isSwitch ? () => onToggle && onToggle(!value) : onPress}
        >
            <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
                <Icon name={icon} size={22} color={color} />
            </View>
            <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{label}</Text>
                {sublabel && <Text style={styles.settingSublabel}>{sublabel}</Text>}
            </View>
            {isSwitch ? (
                <Switch
                    value={value}
                    onValueChange={onToggle}
                    trackColor={{ false: '#e2e8f0', true: '#BFDBFE' }}
                    thumbColor={value ? '#3b82f6' : '#fff'}
                    ios_backgroundColor="#e2e8f0"
                />
            ) : (
                <Icon name="chevron-right" size={20} color="#cbd5e1" />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.mainContainer}>
            {/* Background Decoration */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />

            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Custom Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-left" size={24} color="#334155" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <View style={{ width: 40 }} />
                </View>

                <Animated.ScrollView
                    style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* User Profile Card */}
                    <LinearGradient
                        colors={['#fff', 'rgba(255,255,255,0.8)']}
                        style={styles.profileCard}
                    >
                        <View style={styles.profileAvatar}>
                            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{user?.name || 'Guest User'}</Text>
                            <Text style={styles.profileEmail}>{user?.email || 'No email connected'}</Text>
                            <TouchableOpacity style={styles.editProfileBtn}>
                                <Text style={styles.editProfileText}>Edit Profile</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {/* Preferences Section */}
                    <View style={styles.sectionContainer}>
                        <SectionHeader title="Preferences" />
                        <View style={styles.glassSection}>
                            <SettingItem
                                icon="camera-iris"
                                color="#3b82f6"
                                label="Auto Capture"
                                sublabel="Capture when focus is optimal"
                                isSwitch
                                value={autoCapture}
                                onToggle={(v) => { setAutoCapture(v); handleSettingChange('autoCapture', v); }}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="vibrate"
                                color="#ec4899"
                                label="Haptic Feedback"
                                isSwitch
                                value={enableVibration}
                                onToggle={(v) => { setEnableVibration(v); handleSettingChange('enableVibration', v); }}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="monitor-dashboard"
                                color="#8b5cf6"
                                label="Show Debug Data"
                                sublabel="Display real-time sensor info"
                                isSwitch
                                value={showSensorData}
                                onToggle={(v) => { setShowSensorData(v); handleSettingChange('showSensorData', v); }}
                            />
                        </View>
                    </View>

                    {/* Security & Support */}
                    <View style={styles.sectionContainer}>
                        <SectionHeader title="Security & Support" />
                        <View style={styles.glassSection}>
                            <SettingItem
                                icon="lock-outline"
                                color="#f59e0b"
                                label="Change Password"
                                onPress={() => navigation.navigate('ChangePassword' as never)}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="share-variant"
                                color="#10b981"
                                label="Share App"
                                onPress={handleShare}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="delete-sweep-outline"
                                color="#ef4444"
                                label="Clear Cache"
                                onPress={handleClearCache}
                            />
                        </View>
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Version 1.0.0 (Build 102)</Text>
                    </View>

                </Animated.ScrollView>
            </SafeAreaView>

            <CustomDialog
                visible={dialogConfig.visible}
                title={dialogConfig.title}
                message={dialogConfig.message}
                type={dialogConfig.type}
                showCancel={dialogConfig.showCancel}
                confirmText={dialogConfig.confirmText}
                onConfirm={dialogConfig.onConfirm}
                onClose={() => setDialogConfig(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    bgCircle1: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#dbeafe',
        opacity: 0.5,
    },
    bgCircle2: {
        position: 'absolute',
        bottom: 100,
        left: -80,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: '#fce7f3',
        opacity: 0.5,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginBottom: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        borderRadius: 24,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#fff',
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    profileAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 3,
        borderColor: '#bfdbfe',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 2,
    },
    profileEmail: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 8,
    },
    editProfileBtn: {
        backgroundColor: '#eff6ff',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    editProfileText: {
        fontSize: 12,
        color: '#3b82f6',
        fontWeight: '600',
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 8,
    },
    glassSection: {
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    settingTextContainer: {
        flex: 1,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#334155',
    },
    settingSublabel: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(226,232,240,0.6)',
        marginLeft: 66,
    },
    logoutButton: {
        marginTop: 16,
        backgroundColor: '#fee2e2',
        paddingVertical: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#fecaca',
        alignItems: 'center',
    },
    logoutText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '700',
    },
    footer: {
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 20,
    },
    footerText: {
        color: '#cbd5e1',
        fontSize: 12,
    }
});