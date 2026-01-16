import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Image, Dimensions, RefreshControl, Animated, Easing, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { HomeScreenProps } from '../types';
import { Card } from '../components/UI/Card';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { colors } from '../theme/colors';
import { captureApi } from '../api/capture.api';
import { formatDistanceToNow } from 'date-fns';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;

export const HomeScreen: React.FC = () => {
    const navigation = useNavigation<HomeScreenProps['navigation']>();
    const { user } = useAuthStore();
    const [unreadCount, setUnreadCount] = useState(0);
    const [recentCaptures, setRecentCaptures] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [greeting, setGreeting] = useState('Good Morning,');

    // Animation Values
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Dynamic Greeting calculation
    const updateGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning,');
        else if (hour < 18) setGreeting('Good Afternoon,');
        else setGreeting('Good Evening,');
    };

    const fetchData = async () => {
        try {
            // Fetch Notifications
            const notifResponse = await apiClient.get<any>('/notifications?page=1&pageSize=50');
            const notifItems: any[] = notifResponse.data.items || [];
            const unread = notifItems.filter(item => !item.read).length;
            setUnreadCount(unread);

            // Fetch Recent Scans
            const captureResponse = await captureApi.listCaptures(1, 5); // Fetch top 5
            setRecentCaptures(captureResponse.items || []);
        } catch (error) {
            console.error('Failed to fetch home data', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            updateGreeting(); // Update greeting on focus
            fetchData();

            // Entrance Animation
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
            }).start();
        }, [])
    );

    // Pulse Animation for Hero Button
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    // Quick Actions
    const secondaryItems = [
        {
            title: 'Batches',
            icon: 'test-tube',
            color: '#3b82f6',
            onPress: () => navigation.navigate('ConcentrationManagement'),
        },
        {
            title: 'Statistics',
            icon: 'chart-bar',
            color: '#ec4899',
            onPress: () => navigation.navigate('Statistics'),
        },
        {
            title: 'History',
            icon: 'history',
            color: '#f59e0b',
            onPress: () => navigation.navigate('History'),
        },
        {
            title: 'Guide',
            icon: 'book-open-page-variant',
            color: '#10b981',
            onPress: () => navigation.navigate('Guide'),
        },
        {
            title: 'Settings',
            icon: 'cog',
            color: '#6b7280',
            onPress: () => navigation.navigate('Settings'),
        },
    ];

    const RecentScanItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Review', { captureData: item, imageUri: item.imageUrl })}
            style={styles.recentScanCard}
        >
            <Image source={{ uri: item.imageUrl }} style={styles.recentScanImage} />
            <View style={styles.recentScanOverlay}>
                <View style={styles.recentScanBadge}>
                    <Text style={styles.recentScanScore}>{item.concentration} {item.unit}</Text>
                </View>
                <Text style={styles.recentScanTime}>
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.mainContainer}>
            {/* Background Decoration */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />

            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Glass Header */}
                <View style={styles.header}>
                    <View style={styles.userInfo}>
                        <View style={styles.avatarContainer}>
                            <Text style={styles.avatarText}>
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.greeting}>{greeting}</Text>
                            <Text style={styles.userName} numberOfLines={1}>
                                {user?.name || 'User'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.notificationButton}
                        onPress={() => navigation.navigate('Notifications')}
                    >
                        <Icon name="bell-outline" size={26} color="#475569" />
                        {unreadCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>

                        {/* Hero Section - Start Scanning */}
                        <Animated.View style={[styles.heroContainer, { transform: [{ scale: pulseAnim }] }]}>
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => navigation.navigate('Capture')}
                            >
                                <LinearGradient
                                    colors={['#2563eb', '#3b82f6', '#60a5fa']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.heroGradient}
                                >
                                    <View style={styles.heroContent}>
                                        <View style={styles.heroTextContainer}>
                                            <View style={styles.liveTagContainer}>
                                                <View style={styles.liveDot} />
                                                <Text style={styles.liveTagText}>AI Ready</Text>
                                            </View>
                                            <Text style={styles.heroTitle}>Start Analysis</Text>
                                            <Text style={styles.heroSubtitle}>
                                                Capture and analyze lateral flow tests with precision.
                                            </Text>
                                        </View>
                                        <View style={styles.heroIconContainer}>
                                            <Icon name="camera-iris" size={42} color="#fff" />
                                        </View>
                                    </View>
                                    <View style={styles.heroFooter}>
                                        <Text style={styles.heroActionText}>Tap to scan</Text>
                                        <Icon name="arrow-right" size={20} color="#fff" />
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Recent Scans Widget */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Scans</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('History')}>
                                <Text style={styles.seeAllLink}>See all</Text>
                            </TouchableOpacity>
                        </View>

                        {recentCaptures.length > 0 ? (
                            <FlatList
                                horizontal
                                data={recentCaptures}
                                renderItem={({ item }) => <RecentScanItem item={item} />}
                                keyExtractor={(item) => item.id}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.recentList}
                            />
                        ) : (
                            <View style={styles.emptyRecentCard}>
                                <Icon name="image-filter-center-focus" size={32} color="#94a3b8" />
                                <Text style={styles.emptyRecentText}>No recent scans</Text>
                            </View>
                        )}

                        {/* Grid Layout */}
                        <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Dashboard</Text>
                        <View style={styles.gridContainer}>
                            {secondaryItems.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.gridItem}
                                    onPress={item.onPress}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.glassCard}>
                                        <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                                            <Icon name={item.icon} size={28} color={item.color} />
                                        </View>
                                        <Text style={styles.gridTitle}>{item.title}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Footer Logo */}
                        <View style={styles.footer}>
                            <Image
                                source={require('../../assets/images/icon.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                            <Text style={styles.footerText}>Lateral Flow Scanner v1.0</Text>
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
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#eff6ff', // Light Blue
        opacity: 0.6,
    },
    bgCircle2: {
        position: 'absolute',
        bottom: 100,
        left: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#f0fdf4', // Light Green
        opacity: 0.6,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: 'rgba(255,255,255,0.4)',
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        // Glass Shadow
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 0, // Removed elevation to avoid Android shadow artifacts causing "white box"
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#dbeafe',
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    greeting: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    notificationButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    badge: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#ef4444',
        borderWidth: 2,
        borderColor: '#fff',
    },
    badgeText: {
        fontSize: 0,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    heroContainer: {
        marginBottom: 32,
        borderRadius: 28,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    heroGradient: {
        padding: 24,
        borderRadius: 28,
        overflow: 'hidden',
    },
    heroContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    heroTextContainer: {
        flex: 1,
        paddingRight: 16,
    },
    liveTagContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4ade80', // Green
        marginRight: 6,
    },
    liveTagText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 6,
    },
    heroSubtitle: {
        fontSize: 14,
        color: '#eff6ff',
        lineHeight: 20,
    },
    heroIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    heroFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
        paddingTop: 16,
    },
    heroActionText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#334155',
    },
    seeAllLink: {
        fontSize: 14,
        color: '#3b82f6',
        fontWeight: '600',
    },
    recentList: {
        paddingRight: 20,
        marginBottom: 32,
    },
    recentScanCard: {
        width: 140,
        height: 180,
        borderRadius: 20,
        marginRight: 16,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
    },
    recentScanImage: {
        width: '100%',
        height: '100%',
    },
    recentScanOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    recentScanBadge: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    recentScanScore: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    recentScanTime: {
        color: '#e2e8f0',
        fontSize: 11,
    },
    emptyRecentCard: {
        width: '100%',
        height: 120,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#fff',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    emptyRecentText: {
        color: '#94a3b8',
        fontSize: 14,
        marginTop: 8,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 16,
    },
    gridItem: {
        width: '48%',
    },
    glassCard: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        height: 130, // Fixed height for consistency
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.5)', // More transparent
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        // Reduced shadow to remove "box" feel
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 0,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    gridTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        opacity: 0.5,
        gap: 8
    },
    logo: {
        width: 24,
        height: 24,
        borderRadius: 6,
    },
    footerText: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
    }
});