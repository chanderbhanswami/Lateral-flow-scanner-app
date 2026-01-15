import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Animated, Easing } from 'react-native';
import { Loading } from '../components/UI/Loading';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiClient } from '../api/client';
import { colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
    _id: string;
    title: string;
    body: string;
    type: 'info' | 'warning' | 'success' | 'error';
    read: boolean;
    createdAt: string;
    data?: any;
}

export const NotificationScreen = () => {
    const navigation = useNavigation();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const fetchNotifications = async (pageNum: number, shouldRefresh: boolean = false) => {
        try {
            const response = await apiClient.get<any>(`/notifications?page=${pageNum}&pageSize=20`);
            const { items, hasMore: more } = response.data;

            if (shouldRefresh) {
                setNotifications(items);
            } else {
                setNotifications(prev => [...prev, ...items]);
            }

            setHasMore(more);
            setLoading(false);
            setRefreshing(false);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            setLoading(false);
            setRefreshing(false);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load notifications'
            });
        }
    };

    useEffect(() => {
        fetchNotifications(1, true);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
        }).start();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchNotifications(1, true);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchNotifications(nextPage);
        }
    };

    const markAsRead = async (id: string, index: number) => {
        try {
            await apiClient.patch(`/notifications/${id}/read`);
            const updated = [...notifications];
            updated[index].read = true;
            setNotifications(updated);
        } catch (error) {
            console.error('Failed to mark read:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return 'check-circle';
            case 'warning': return 'alert-circle';
            case 'error': return 'close-circle';
            default: return 'information';
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'success': return '#10b981'; // emerald-500
            case 'warning': return '#f59e0b'; // amber-500
            case 'error': return '#ef4444'; // red-500
            default: return '#3b82f6'; // blue-500
        }
    };

    const renderItem = ({ item, index }: { item: Notification; index: number }) => (
        <TouchableOpacity
            style={[styles.glassCard, !item.read && styles.unreadCard]}
            activeOpacity={0.8}
            onPress={() => !item.read && markAsRead(item._id, index)}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${getColor(item.type)}15` }]}>
                <Icon name={getIcon(item.type)} size={24} color={getColor(item.type)} />
            </View>
            <View style={styles.contentContainer}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.title, !item.read && styles.unreadTitle]}>{item.title}</Text>
                    {!item.read && <View style={styles.dot} />}
                </View>
                <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.time}>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.mainContainer}>
            {/* Background Decoration */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />

            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-left" size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <TouchableOpacity
                        style={styles.markAllBtn}
                        onPress={() => {
                            apiClient.patch('/notifications/read-all').then(() => onRefresh());
                        }}
                    >
                        <Text style={styles.markAllText}>Mark all read</Text>
                    </TouchableOpacity>
                </View>

                {loading && !refreshing && page === 1 ? (
                    <Loading size="large" color="#3b82f6" />
                ) : (
                    <Animated.FlatList
                        data={notifications}
                        renderItem={renderItem}
                        keyExtractor={item => item._id}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.5}
                        contentContainerStyle={styles.list}
                        style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <View style={styles.emptyIconContainer}>
                                    <Icon name="bell-off-outline" size={48} color="#cbd5e1" />
                                </View>
                                <Text style={styles.emptyText}>No notifications</Text>
                                <Text style={styles.emptySubtext}>You're all caught up!</Text>
                            </View>
                        }
                    />
                )}
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
        top: -50,
        right: -50,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: '#dbeafe', // Very light blue
        opacity: 0.5,
    },
    bgCircle2: {
        position: 'absolute',
        bottom: 100,
        left: -80,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#f3e8ff', // Very light purple
        opacity: 0.5,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: 'rgba(255,255,255,0.7)',
        zIndex: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.5)',
    },
    backButton: {
        marginRight: 16,
        padding: 4,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1e293b',
        flex: 1,
        letterSpacing: -0.5,
    },
    markAllBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 20,
    },
    markAllText: {
        color: '#3b82f6',
        fontSize: 12,
        fontWeight: '700',
    },
    list: {
        padding: 20,
    },
    glassCard: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    unreadCard: {
        backgroundColor: '#fefce8',
        borderColor: '#fef08a',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    contentContainer: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
        flex: 1,
    },
    unreadTitle: {
        color: '#0f172a',
        fontWeight: '700',
    },
    body: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 6,
        lineHeight: 20,
    },
    time: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3b82f6',
        marginLeft: 8,
    },
    empty: {
        alignItems: 'center',
        marginTop: 80,
        opacity: 0.7,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#475569',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 4,
    },
});
