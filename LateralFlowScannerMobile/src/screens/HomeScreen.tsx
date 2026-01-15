import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { HomeScreenProps } from '../types';
import { Card } from '../components/UI/Card';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;

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
            title: 'Notifications',
            subtitle: 'View alerts & updates',
            icon: 'bell-outline',
            color: '#ef4444',
            onPress: () => navigation.navigate('Notifications'),
        },
        {
            title: 'Settings',
            subtitle: 'App preferences & logout',
            icon: 'cog',
            color: '#6b7280',
            onPress: () => navigation.navigate('Settings'),
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
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Image
                        source={require('../../assets/images/icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
                            Lateral Flow Scanner
                        </Text>
                        <Text style={styles.subtitle}>Professional Test Kit Analysis</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity key={index} onPress={item.onPress}>
                        <Card style={styles.menuCard}>
                            <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                                <Icon name={item.icon} size={isSmallScreen ? 26 : 32} color={item.color} />
                            </View>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuTitle}>{item.title}</Text>
                                <Text style={styles.menuSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                            </View>
                            <Icon name="chevron-right" size={24} color="#9ca3af" />
                        </Card>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        width: isSmallScreen ? 40 : 50,
        height: isSmallScreen ? 40 : 50,
        borderRadius: 10,
        marginRight: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    title: {
        fontSize: isSmallScreen ? 20 : 24,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: isSmallScreen ? 13 : 15,
        color: '#6b7280',
    },
    scrollContent: {
        padding: 12,
        paddingBottom: 24,
    },
    menuCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: isSmallScreen ? 12 : 16,
        marginBottom: 10,
    },
    iconContainer: {
        width: isSmallScreen ? 48 : 56,
        height: isSmallScreen ? 48 : 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: isSmallScreen ? 15 : 17,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: isSmallScreen ? 12 : 14,
        color: '#6b7280',
    },
});