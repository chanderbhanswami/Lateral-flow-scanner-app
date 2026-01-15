import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Switch, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { CustomDialog } from '../components/UI/CustomDialog';
import { storageService } from '../services/storage.service';
import Toast from 'react-native-toast-message';

export const SettingsScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user, logout } = useAuthStore();

    const [autoCapture, setAutoCapture] = useState(true);
    const [showSensorData, setShowSensorData] = useState(true);
    const [enableVibration, setEnableVibration] = useState(true);
    const [highQualityMode, setHighQualityMode] = useState(true);

    const [dialogConfig, setDialogConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'error';
        onConfirm?: () => void;
        showCancel?: boolean;
        confirmText?: string;
    }>({ visible: false, title: '', message: '', type: 'info' });

    // Load settings from async storage on mount
    useEffect(() => {
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
    }, []);

    const handleSettingChange = async (key: string, value: boolean) => {
        await storageService.saveSetting(key, value);
        Toast.show({
            type: 'success',
            text1: 'Setting Updated',
        });
    };

    const handleLogout = () => {
        setDialogConfig({
            visible: true,
            title: 'Logout',
            message: 'Are you sure you want to logout?',
            type: 'warning',
            showCancel: true,
            confirmText: 'Logout',
            onConfirm: async () => {
                setDialogConfig(prev => ({ ...prev, visible: false }));
                await logout();
                Toast.show({
                    type: 'success',
                    text1: 'Logged out successfully',
                });
            }
        });
    };

    const handleClearCache = () => {
        setDialogConfig({
            visible: true,
            title: 'Clear Cache',
            message: 'This will clear all cached data. Continue?',
            type: 'warning',
            showCancel: true,
            confirmText: 'Clear',
            onConfirm: async () => {
                setDialogConfig(prev => ({ ...prev, visible: false }));
                // Clear cache logic placeholder
                Toast.show({
                    type: 'success',
                    text1: 'Cache cleared',
                });
            }
        });
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* User Profile */}
            <Card style={styles.profileCard}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatar}>
                        <Icon name="account" size={40} color="#3b82f6" />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{user?.name}</Text>
                        <Text style={styles.profileEmail}>{user?.email}</Text>
                    </View>
                </View>
            </Card>

            {/* Camera Settings */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Camera Settings</Text>

                <Card style={styles.settingCard}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Auto Capture</Text>
                            <Text style={styles.settingDescription}>
                                Automatically capture when conditions are optimal
                            </Text>
                        </View>
                        <Switch
                            value={autoCapture}
                            onValueChange={(value) => {
                                setAutoCapture(value);
                                handleSettingChange('autoCapture', value);
                            }}
                            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                            thumbColor={autoCapture ? '#3b82f6' : '#f3f4f6'}
                        />
                    </View>
                </Card>

                <Card style={styles.settingCard}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Show Sensor Data</Text>
                            <Text style={styles.settingDescription}>
                                Display real-time sensor information during capture
                            </Text>
                        </View>
                        <Switch
                            value={showSensorData}
                            onValueChange={(value) => {
                                setShowSensorData(value);
                                handleSettingChange('showSensorData', value);
                            }}
                            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                            thumbColor={showSensorData ? '#3b82f6' : '#f3f4f6'}
                        />
                    </View>
                </Card>

                <Card style={styles.settingCard}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>High Quality Mode</Text>
                            <Text style={styles.settingDescription}>
                                Capture images at maximum resolution (may take longer)
                            </Text>
                        </View>
                        <Switch
                            value={highQualityMode}
                            onValueChange={(value) => {
                                setHighQualityMode(value);
                                handleSettingChange('highQualityMode', value);
                            }}
                            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                            thumbColor={highQualityMode ? '#3b82f6' : '#f3f4f6'}
                        />
                    </View>
                </Card>
            </View>

            {/* App Settings */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>App Settings</Text>

                <Card style={styles.settingCard}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Enable Vibration</Text>
                            <Text style={styles.settingDescription}>
                                Vibrate on capture and other actions
                            </Text>
                        </View>
                        <Switch
                            value={enableVibration}
                            onValueChange={(value) => {
                                setEnableVibration(value);
                                handleSettingChange('enableVibration', value);
                            }}
                            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                            thumbColor={enableVibration ? '#3b82f6' : '#f3f4f6'}
                        />
                    </View>
                </Card>

                <TouchableOpacity onPress={handleClearCache}>
                    <Card style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Clear Cache</Text>
                                <Text style={styles.settingDescription}>
                                    Remove temporary files and cached data
                                </Text>
                            </View>
                            <Icon name="chevron-right" size={24} color="#9ca3af" />
                        </View>
                    </Card>
                </TouchableOpacity>
            </View>

            {/* About */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>

                <Card style={styles.aboutCard}>
                    <Text style={styles.aboutLabel}>Version</Text>
                    <Text style={styles.aboutValue}>1.0.0</Text>
                </Card>

                <Card style={styles.aboutCard}>
                    <Text style={styles.aboutLabel}>Build Number</Text>
                    <Text style={styles.aboutValue}>100</Text>
                </Card>
            </View>

            {/* Logout */}
            <Button
                title="Logout"
                onPress={handleLogout}
                variant="outline"
                style={styles.logoutButton}
            />

            <View style={styles.footer}>
                <Image
                    source={require('../../assets/images/icon.png')}
                    style={styles.footerLogo}
                    resizeMode="contain"
                />
                <Text style={styles.footerText}>© 2024 Lateral Flow Scanner</Text>
            </View>
            {/* Shared Custom Dialog */}
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
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    content: {
        padding: 16,
    },
    profileCard: {
        marginBottom: 24,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#dbeafe',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 14,
        color: '#6b7280',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
        marginLeft: 4,
    },
    settingCard: {
        marginBottom: 12,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingInfo: {
        flex: 1,
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1f2937',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
    },
    aboutCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    aboutLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1f2937',
    },
    aboutValue: {
        fontSize: 16,
        color: '#6b7280',
    },
    logoutButton: {
        marginTop: 16,
        marginBottom: 24,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    footerText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    footerLogo: {
        width: 32,
        height: 32,
        marginBottom: 8,
        borderRadius: 8,
        opacity: 0.5,
    },
});