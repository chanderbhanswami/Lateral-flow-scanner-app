import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { statisticsApi, UserStatistics, GlobalStatistics } from '../api/statistics.api';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';

export const StatisticsScreen: React.FC = () => {
    const navigation = useNavigation();
    const [userStats, setUserStats] = useState<UserStatistics | null>(null);
    const [globalStats, setGlobalStats] = useState<GlobalStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

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
    }, []);

    const formatStorage = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Statistics Dashboard</Text>
                <Text style={styles.subtitle}>Your Usage & Global Insights</Text>
            </View>

            {/* User Stats */}
            <Text style={styles.sectionTitle}>Your Statistics</Text>
            <View style={styles.grid}>
                <Card style={styles.statCard}>
                    <Text style={styles.statValue}>{userStats?.totalCaptures || 0}</Text>
                    <Text style={styles.statLabel}>Total Captures</Text>
                </Card>
                <Card style={styles.statCard}>
                    <Text style={styles.statValue}>{userStats?.totalUploads || 0}</Text>
                    <Text style={styles.statLabel}>Uploads</Text>
                </Card>
                <Card style={styles.statCard}>
                    <Text style={styles.statValue}>{formatStorage(userStats?.storageUsed || 0)}</Text>
                    <Text style={styles.statLabel}>Storage Used</Text>
                </Card>
                <Card style={styles.statCard}>
                    <Text style={styles.statValue}>
                        {userStats?.lastUploadDate ? new Date(userStats.lastUploadDate).toLocaleDateString() : 'N/A'}
                    </Text>
                    <Text style={styles.statLabel}>Last Upload</Text>
                </Card>
            </View>

            {/* Global Stats */}
            <Text style={styles.sectionTitle}>Global Community</Text>
            <View style={styles.grid}>
                <Card style={[styles.statCard, styles.globalCard]}>
                    <Text style={styles.statValue}>{globalStats?.totalUsers || 0}</Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                </Card>
                <Card style={[styles.statCard, styles.globalCard]}>
                    <Text style={styles.statValue}>{globalStats?.totalCaptures || 0}</Text>
                    <Text style={styles.statLabel}>Total Scans</Text>
                </Card>
                <Card style={[styles.statCard, styles.globalCard]}>
                    <Text style={styles.statValue}>{globalStats?.activeUsers7Days || 0}</Text>
                    <Text style={styles.statLabel}>Active (7d)</Text>
                </Card>
                <Card style={[styles.statCard, styles.globalCard]}>
                    <Text style={styles.statValue}>{formatStorage(globalStats?.totalStorageUsed || 0)}</Text>
                    <Text style={styles.statLabel}>Global Data</Text>
                </Card>
            </View>

            <View style={{ height: 20 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        padding: 16,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
        marginTop: 8,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statCard: {
        width: '48%',
        marginBottom: 16,
        alignItems: 'center',
        paddingVertical: 20,
    },
    globalCard: {
        backgroundColor: '#e0f2fe',
        borderColor: '#bae6fd',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
});
