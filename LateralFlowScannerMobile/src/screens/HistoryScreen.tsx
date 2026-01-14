import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Text, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { captureApi } from '../api/capture.api';
import { Card } from '../components/UI/Card';
import { Loading } from '../components/UI/Loading';
import { formatDistanceToNow } from 'date-fns';

export const HistoryScreen: React.FC = () => {
    const [page, setPage] = useState(1);

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['captures', page],
        queryFn: () => captureApi.listCaptures(page, 20),
    });

    const handleRefresh = () => {
        refetch();
    };

    const renderItem = ({ item }: any) => (
        <TouchableOpacity>
            <Card style={styles.captureCard}>
                <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                />
                <View style={styles.captureInfo}>
                    <View style={styles.captureHeader}>
                        <Text style={styles.concentration}>
                            {item.concentration}
                        </Text>
                        <View style={[
                            styles.modeBadge,
                            item.captureMode === 'auto' ? styles.autoBadge : styles.manualBadge,
                        ]}>
                            <Text style={styles.modeText}>
                                {item.captureMode === 'auto' ? 'Auto' : 'Manual'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <Icon name="clock-outline" size={14} color="#6b7280" />
                        <Text style={styles.metaText}>
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                        </Text>
                    </View>

                    <View style={styles.metaRow}>
                        <Icon name="chart-line" size={14} color="#6b7280" />
                        <Text style={styles.metaText}>
                            Quality: {item.analysisData.qualityScore.toFixed(0)}/100
                        </Text>
                    </View>

                    {item.notes && (
                        <Text style={styles.notes} numberOfLines={2}>
                            {item.notes}
                        </Text>
                    )}
                </View>

                <View style={styles.statusIndicator}>
                    {item.status === 'uploaded' && (
                        <Icon name="check-circle" size={20} color="#10b981" />
                    )}
                    {item.status === 'pending' && (
                        <Icon name="clock-outline" size={20} color="#f59e0b" />
                    )}
                    {item.status === 'failed' && (
                        <Icon name="alert-circle" size={20} color="#ef4444" />
                    )}
                </View>
            </Card>
        </TouchableOpacity>
    );

    if (isLoading) {
        return <Loading text="Loading history..." />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={data?.items || []}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Icon name="image-off" size={64} color="#d1d5db" />
                        <Text style={styles.emptyText}>No captures yet</Text>
                        <Text style={styles.emptySubtext}>
                            Start scanning to see your capture history
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    list: {
        padding: 16,
    },
    captureCard: {
        flexDirection: 'row',
        padding: 12,
        marginBottom: 12,
        position: 'relative',
    },
    thumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#e5e7eb',
        marginRight: 12,
    },
    captureInfo: {
        flex: 1,
    },
    captureHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    concentration: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    modeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    autoBadge: {
        backgroundColor: '#dbeafe',
    },
    manualBadge: {
        backgroundColor: '#fef3c7',
    },
    modeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1f2937',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    metaText: {
        fontSize: 13,
        color: '#6b7280',
        marginLeft: 6,
    },
    notes: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 4,
        fontStyle: 'italic',
    },
    statusIndicator: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
        textAlign: 'center',
    },
});