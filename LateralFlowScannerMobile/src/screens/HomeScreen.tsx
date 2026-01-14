import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { HomeScreenProps } from '../types';
import { Card } from '../components/UI/Card';

export const HomeScreen: React.FC = () => {
    const navigation = useNavigation<HomeScreenProps['navigation']>();

    const menuItems = [
        {
            title: 'Start Scanning',
            subtitle: 'Begin capturing lateral flow tests',
            icon: 'camera',
            color: '#10b981',
            onPress: () => navigation.navigate('Capture'),
        },
        {
            title: 'Concentration Batches',
            subtitle: 'Manage concentration sizes',
            icon: 'test-tube',
            color: '#3b82f6',
            onPress: () => navigation.navigate('ConcentrationManagement'),
        },
        {
            title: 'Guide',
            subtitle: 'Learn how to use the app',
            icon: 'book-open-variant',
            color: '#8b5cf6',
            onPress: () => navigation.navigate('Guide'),
        },
        {
            title: 'History',
            subtitle: 'View past captures',
            icon: 'history',
            color: '#f59e0b',
            onPress: () => navigation.navigate('History'),
        },
        {
            title: 'Settings',
            subtitle: 'App preferences',
            icon: 'cog',
            color: '#6b7280',
            onPress: () => ({}), // Placeholder until Settings screen is ready
        },
        {
            title: 'Statistics',
            subtitle: 'Global insights & usage',
            icon: 'chart-bar',
            color: '#ec4899',
            onPress: () => navigation.navigate('Statistics'),
        },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Image
                        source={require('../../assets/images/icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.title}>Lateral Flow Scanner</Text>
                        <Text style={styles.subtitle}>Professional Test Kit Analysis</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity key={index} onPress={item.onPress}>
                        <Card style={styles.menuCard}>
                            <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                                <Icon name={item.icon} size={32} color={item.color} />
                            </View>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuTitle}>{item.title}</Text>
                                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                            </View>
                            <Icon name="chevron-right" size={24} color="#9ca3af" />
                        </Card>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        padding: 24,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        width: 50,
        height: 50,
        borderRadius: 12,
        marginRight: 16,
    },
    headerTextContainer: {
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
    },
    scrollContent: {
        padding: 16,
    },
    menuCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    menuSubtitle: {
        fontSize: 14,
        color: '#6b7280',
    },
});