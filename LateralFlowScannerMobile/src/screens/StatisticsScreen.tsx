import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl, Dimensions, Animated, Easing, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { statisticsApi, UserStatistics, GlobalStatistics } from '../api/statistics.api';
import { Card } from '../components/UI/Card';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { moderateScale, verticalScale, scale } from '../utils/responsive';

// CountUp Component
const CountUp = ({ value, suffix = '', formatter = (v: number) => v.toString() }: { value: number, suffix?: string, formatter?: (v: number) => string }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: value,
            duration: 1500,
            useNativeDriver: false, // needed for listener
            easing: Easing.out(Easing.exp),
        }).start();

        const listener = animatedValue.addListener(({ value: v }) => {
            setDisplayValue(Math.floor(v));
        });

        return () => {
            animatedValue.removeAllListeners();
        };
    }, [value]);

    return <Text style={styles.statValue}>{formatter(displayValue)}{suffix}</Text>;
};

export const StatisticsScreen: React.FC = () => {
    const navigation = useNavigation();
    const [userStats, setUserStats] = useState<UserStatistics | null>(null);
    const [globalStats, setGlobalStats] = useState<GlobalStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    const fetchData = async () => {
        try {
            const [user, global] = await Promise.all([
                statisticsApi.getUserStatistics(),
                statisticsApi.getGlobalStatistics(),
            ]);
            setUserStats(user);
            setGlobalStats(global);
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    useEffect(() => {
        setLoading(true);
        fetchData().finally(() => setLoading(false));
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
        }).start();
    }, []);

    const formatStorage = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Helper to extract numeric part for CountUp if needed, but simplified to passing raw value
    // Since formatStorage returns string, we will just use simple text for storage

    return (
        <View style={styles.mainContainer}>
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />

            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
                >
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
                                <Icon name="arrow-left" size={28} color="#1e293b" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Statistics</Text>
                            <Text style={styles.headerSubtitle}>Insights & usage metrics</Text>
                        </View>

                        {/* User Stats Section */}
                        <View style={styles.sectionHeader}>
                            <Icon name="account-circle-outline" size={24} color="#3b82f6" />
                            <Text style={styles.sectionTitle}>Your Activity</Text>
                        </View>

                        <View style={styles.grid}>
                            <LinearGradient colors={['#eff6ff', '#ffffff']} style={styles.statCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                <View style={styles.iconBox}>
                                    <Icon name="camera-iris" size={24} color="#3b82f6" />
                                </View>
                                <CountUp value={userStats?.totalCaptures || 0} />
                                <Text style={styles.statLabel}>Total Scans</Text>
                            </LinearGradient>

                            <LinearGradient colors={['#eff6ff', '#ffffff']} style={styles.statCard}>
                                <View style={styles.iconBox}>
                                    <Icon name="cloud-upload" size={24} color="#3b82f6" />
                                </View>
                                <CountUp value={userStats?.totalUploads || 0} />
                                <Text style={styles.statLabel}>Uploads</Text>
                            </LinearGradient>

                            <LinearGradient colors={['#eff6ff', '#ffffff']} style={styles.statCard}>
                                <View style={styles.iconBox}>
                                    <Icon name="database" size={24} color="#3b82f6" />
                                </View>
                                {/* Storage is text, so no CountUp */}
                                <Text style={styles.statValue}>{formatStorage(userStats?.storageUsed || 0)}</Text>
                                <Text style={styles.statLabel}>Storage</Text>
                            </LinearGradient>

                            <LinearGradient colors={['#eff6ff', '#ffffff']} style={styles.statCard}>
                                <View style={styles.iconBox}>
                                    <Icon name="calendar-clock" size={24} color="#3b82f6" />
                                </View>
                                <Text style={styles.statValueSmall}>
                                    {userStats?.lastUploadDate ? new Date(userStats.lastUploadDate).toLocaleDateString() : 'N/A'}
                                </Text>
                                <Text style={styles.statLabel}>Last Activity</Text>
                            </LinearGradient>
                        </View>

                        {/* Global Stats Section */}
                        <View style={styles.sectionHeader}>
                            <Icon name="earth" size={24} color="#8b5cf6" />
                            <Text style={styles.sectionTitle}>Global Community</Text>
                        </View>

                        <View style={styles.grid}>
                            <LinearGradient colors={['#f5f3ff', '#ffffff']} style={[styles.statCard, styles.globalCard]}>
                                <CountUp value={globalStats?.totalUsers || 0} />
                                <Text style={styles.statLabel}>Users</Text>
                            </LinearGradient>

                            <LinearGradient colors={['#f5f3ff', '#ffffff']} style={[styles.statCard, styles.globalCard]}>
                                <CountUp value={globalStats?.totalCaptures || 0} />
                                <Text style={styles.statLabel}>Total Scans</Text>
                            </LinearGradient>

                            <LinearGradient colors={['#f5f3ff', '#ffffff']} style={[styles.statCard, styles.globalCard]}>
                                <CountUp value={globalStats?.activeUsers7Days || 0} />
                                <Text style={styles.statLabel}>Active (7d)</Text>
                            </LinearGradient>

                            <LinearGradient colors={['#f5f3ff', '#ffffff']} style={[styles.statCard, styles.globalCard]}>
                                <Text style={styles.statValue}>{formatStorage(globalStats?.totalStorageUsed || 0)}</Text>
                                <Text style={styles.statLabel}>Data Stored</Text>
                            </LinearGradient>
                        </View>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
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
        top: verticalScale(-50),
        right: scale(-50),
        width: moderateScale(300),
        height: moderateScale(300),
        borderRadius: moderateScale(150),
        backgroundColor: '#dbeafe',
        opacity: 0.5,
    },
    bgCircle2: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: moderateScale(200),
        height: moderateScale(200),
        borderRadius: moderateScale(100),
        backgroundColor: '#e0e7ff',
        opacity: 0.4,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: moderateScale(24),
    },
    header: {
        marginBottom: verticalScale(32),
    },
    headerTitle: {
        fontSize: moderateScale(32),
        fontWeight: '800',
        color: '#1e293b',
        letterSpacing: -1,
    },
    headerSubtitle: {
        fontSize: moderateScale(16),
        color: '#64748b',
        marginTop: verticalScale(4),
        fontWeight: '500',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(16),
        gap: moderateScale(8),
    },
    sectionTitle: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: '#334155',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: verticalScale(32),
    },
    statCard: {
        width: '48%',
        marginBottom: verticalScale(16),
        borderRadius: moderateScale(20),
        padding: moderateScale(16),
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff',
    },
    globalCard: {
        borderColor: '#ede9fe',
    },
    iconBox: {
        width: moderateScale(48),
        height: moderateScale(48),
        borderRadius: moderateScale(24),
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(12),
        shadowColor: '#94a3b8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: {
        fontSize: moderateScale(24),
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: verticalScale(4),
        textAlign: 'center',
    },
    statValueSmall: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: verticalScale(4),
        textAlign: 'center',
    },
    statLabel: {
        fontSize: moderateScale(13),
        color: '#64748b',
        fontWeight: '600',
        textAlign: 'center',
    },
});
