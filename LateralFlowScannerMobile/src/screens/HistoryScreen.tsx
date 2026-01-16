import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Text, Image, TouchableOpacity, RefreshControl, Animated, Easing, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { captureApi } from '../api/capture.api';
import { Loading } from '../components/UI/Loading';
import { formatDistanceToNow } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDebounce } from '../hooks/useDebounce';
import { usePrevious } from '../hooks/usePrevious';

import { PaginatedResponse, CaptureData } from '@lateralflowscanner/shared';

export const HistoryScreen: React.FC = () => {
    const navigation = useNavigation();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');

    // Use useDebounce hook instead of inline setTimeout
    const debouncedSearch = useDebounce(searchQuery, 500);

    // Use usePrevious to detect search changes and reset page
    const prevSearch = usePrevious(debouncedSearch);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Reset to first page when search changes
    useEffect(() => {
        if (prevSearch !== undefined && prevSearch !== debouncedSearch) {
            setPage(1);
        }
    }, [debouncedSearch, prevSearch]);

    const { data, isLoading, refetch, isRefetching } = useQuery<PaginatedResponse<CaptureData>>({
        queryKey: ['captures', page, debouncedSearch],
        queryFn: () => captureApi.listCaptures(page, 20, debouncedSearch),
    });

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
        }).start();
    }, []);

    const handleRefresh = () => {
        setPage(1);
        refetch();
    };

    const renderItem = ({ item, index }: any) => {
        // Staggered entrance could be complex in FlatList, keeping simple fade/slide for list container
        return (
            <TouchableOpacity activeOpacity={0.8} style={styles.cardContainer}>
                <View style={styles.glassCard}>
                    <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                    />
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.concentrationLabel}>
                                {item.concentration} <Text style={styles.unitText}>{item.unit}</Text>
                            </Text>
                            <View style={[
                                styles.statusPill,
                                item.status === 'uploaded' ? styles.statusSuccess :
                                    item.status === 'pending' ? styles.statusWarning : styles.statusError
                            ]}>
                                <Icon
                                    name={item.status === 'uploaded' ? 'check' : item.status === 'pending' ? 'clock-outline' : 'alert-circle-outline'}
                                    size={12}
                                    color={item.status === 'uploaded' ? '#166534' : item.status === 'pending' ? '#b45309' : '#991b1b'}
                                />
                                <Text style={[
                                    styles.statusText,
                                    { color: item.status === 'uploaded' ? '#166534' : item.status === 'pending' ? '#b45309' : '#991b1b' }
                                ]}>
                                    {item.status === 'uploaded' ? 'Synced' : item.status}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.metaContainer}>
                            <View style={styles.metaItem}>
                                <Icon name="clock-outline" size={14} color="#94a3b8" />
                                <Text style={styles.metaText}>
                                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                </Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Icon name="chart-bar" size={14} color="#94a3b8" />
                                <Text style={styles.metaText}>
                                    Score: {item.analysisData?.qualityScore?.toFixed(0) || 'N/A'}
                                </Text>
                            </View>
                        </View>

                        {item.notes && (
                            <Text style={styles.notes} numberOfLines={1}>
                                {item.notes}
                            </Text>
                        )}
                    </View>
                    <Icon name="chevron-right" size={20} color="#cbd5e1" style={styles.chevron} />
                </View>
            </TouchableOpacity>
        );
    };

    if (isLoading && page === 1 && !data) {
        return <Loading text="Loading history..." />;
    }

    return (
        <View style={styles.mainContainer}>
            {/* Background Decoration */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />

            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="arrow-left" size={28} color="#1e293b" />
                        </TouchableOpacity>
                        <Text style={styles.title}>History</Text>
                    </View>
                    <View style={styles.searchContainer}>
                        <Icon name="magnify" size={20} color="#94a3b8" />
                        <TextInput
                            placeholder="Search records..."
                            placeholderTextColor="#94a3b8"
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Icon name="close-circle" size={18} color="#cbd5e1" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <Animated.FlatList
                    data={data?.items || []}
                    renderItem={renderItem}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#3b82f6" />
                    }
                    style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <View style={styles.emptyIconContainer}>
                                <Icon name={debouncedSearch ? "text-search" : "history"} size={48} color="#cbd5e1" />
                            </View>
                            <Text style={styles.emptyText}>
                                {debouncedSearch ? "No matching results" : "No history yet"}
                            </Text>
                            <Text style={styles.emptySubtext}>
                                {debouncedSearch ? `No records found for "${debouncedSearch}"` : "Your scan results will appear here"}
                            </Text>
                        </View>
                    }
                    onEndReached={() => {
                        if (data?.hasMore) {
                            setPage(page + 1);
                        }
                    }}
                    onEndReachedThreshold={0.5}
                />
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
        top: 100,
        left: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#f0f9ff', // Pale blue
        opacity: 0.6,
    },
    bgCircle2: {
        position: 'absolute',
        bottom: 0,
        right: -50,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: '#fdf4ff', // Pale purple
        opacity: 0.6,
    },
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: 'rgba(255,255,255,0.7)',
        zIndex: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1e293b',
        letterSpacing: -0.5,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: {
        marginRight: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#94a3b8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: '#334155',
    },
    list: {
        padding: 20,
        paddingTop: 10,
    },
    cardContainer: {
        marginBottom: 16,
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    glassCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
    },
    thumbnail: {
        width: 70,
        height: 70,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
    },
    cardContent: {
        flex: 1,
        marginLeft: 14,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    concentrationLabel: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1e293b',
    },
    unitText: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    statusSuccess: { backgroundColor: '#dcfce7' },
    statusWarning: { backgroundColor: '#ffedd5' },
    statusError: { backgroundColor: '#fee2e2' },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    metaContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 6,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    notes: {
        fontSize: 12,
        color: '#94a3b8',
        fontStyle: 'italic',
    },
    chevron: {
        marginLeft: 8,
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
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
    }
});