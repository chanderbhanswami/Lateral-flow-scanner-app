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
import { moderateScale, verticalScale, scale } from '../utils/responsive';

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
        top: verticalScale(100),
        left: scale(-100),
        width: moderateScale(300),
        height: moderateScale(300),
        borderRadius: moderateScale(150),
        backgroundColor: '#f0f9ff', // Pale blue
        opacity: 0.6,
    },
    bgCircle2: {
        position: 'absolute',
        bottom: 0,
        right: scale(-50),
        width: moderateScale(250),
        height: moderateScale(250),
        borderRadius: moderateScale(125),
        backgroundColor: '#fdf4ff', // Pale purple
        opacity: 0.6,
    },
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: moderateScale(20),
        paddingTop: verticalScale(16),
        paddingBottom: verticalScale(16),
        backgroundColor: 'rgba(255,255,255,0.7)',
        zIndex: 10,
    },
    title: {
        fontSize: moderateScale(28),
        fontWeight: '800',
        color: '#1e293b',
        letterSpacing: -0.5,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    backButton: {
        marginRight: moderateScale(12),
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: moderateScale(12),
        height: verticalScale(48),
        borderRadius: moderateScale(14),
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
        marginLeft: moderateScale(8),
        fontSize: moderateScale(15),
        color: '#334155',
    },
    list: {
        padding: moderateScale(20),
        paddingTop: verticalScale(10),
    },
    cardContainer: {
        marginBottom: verticalScale(16),
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    glassCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: moderateScale(20),
        padding: moderateScale(12),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
    },
    thumbnail: {
        width: moderateScale(70),
        height: moderateScale(70),
        borderRadius: moderateScale(16),
        backgroundColor: '#f1f5f9',
    },
    cardContent: {
        flex: 1,
        marginLeft: moderateScale(14),
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(6),
    },
    concentrationLabel: {
        fontSize: moderateScale(17),
        fontWeight: '700',
        color: '#1e293b',
    },
    unitText: {
        fontSize: moderateScale(13),
        color: '#64748b',
        fontWeight: '500',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: moderateScale(8),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(12),
        gap: moderateScale(4),
    },
    statusSuccess: { backgroundColor: '#dcfce7' },
    statusWarning: { backgroundColor: '#ffedd5' },
    statusError: { backgroundColor: '#fee2e2' },
    statusText: {
        fontSize: moderateScale(11),
        fontWeight: '700',
    },
    metaContainer: {
        flexDirection: 'row',
        gap: moderateScale(12),
        marginBottom: verticalScale(6),
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(4),
    },
    metaText: {
        fontSize: moderateScale(12),
        color: '#64748b',
        fontWeight: '500',
    },
    notes: {
        fontSize: moderateScale(12),
        color: '#94a3b8',
        fontStyle: 'italic',
    },
    chevron: {
        marginLeft: moderateScale(8),
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: verticalScale(80),
        opacity: 0.7,
    },
    emptyIconContainer: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(40),
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    emptyText: {
        fontSize: moderateScale(18),
        fontWeight: '700',
        color: '#475569',
    },
    emptySubtext: {
        fontSize: moderateScale(14),
        color: '#94a3b8',
        marginTop: verticalScale(4),
    }
});