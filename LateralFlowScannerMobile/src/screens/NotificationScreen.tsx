import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiClient } from '../api/client';
import { colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

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
            case 'success': return colors.success;
            case 'warning': return colors.warning;
            case 'error': return colors.error;
            default: return colors.primary;
        }
    };

    const renderItem = ({ item, index }: { item: Notification; index: number }) => (
        <TouchableOpacity
            style={[styles.item, !item.read && styles.unreadItem]}
            onPress={() => !item.read && markAsRead(item._id, index)}
        >
            <View style={styles.iconContainer}>
                <Icon name={getIcon(item.type)} size={24} color={getColor(item.type)} />
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <TouchableOpacity onPress={() => {
                    apiClient.patch('/notifications/read-all').then(() => onRefresh());
                }}>
                    <Text style={styles.markAll}>Mark all read</Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Icon name="bell-off-outline" size={48} color={colors.textSecondary} />
                            <Text style={styles.emptyText}>No notifications yet</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        justifyContent: 'space-between',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        flex: 1,
    },
    markAll: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    list: {
        padding: 16,
    },
    item: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    unreadItem: {
        backgroundColor: '#f0f9ff', // Light blue tint
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    iconContainer: {
        marginRight: 12,
    },
    contentContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    body: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    time: {
        fontSize: 12,
        color: colors.textTertiary,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        marginLeft: 8,
    },
    loader: {
        marginTop: 40,
    },
    empty: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.textSecondary,
    },
});
