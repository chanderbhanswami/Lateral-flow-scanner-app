import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Animated, Easing, TouchableOpacity } from 'react-native';
import { Card } from '../components/UI/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { moderateScale, verticalScale, scale } from '../utils/responsive';

export const GuideScreen: React.FC = () => {
    const navigation = useNavigation();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
        }).start();
    }, []);

    const steps = [
        {
            title: 'Prepare Your Environment',
            icon: 'weather-sunny',
            content: [
                'Ensure good, even lighting',
                'Place cassette on flat, non-reflective surface',
                'Remove any obstacles around the cassette',
            ],
        },
        {
            title: 'Select Batch',
            icon: 'flask',
            content: [
                'Choose a concentration batch',
                'Or create a new one instantly',
                'Pre-fills data for faster workflow',
            ],
        },
        {
            title: 'Position Cassette',
            icon: 'scan-helper',
            content: [
                'Align cassette with the guide frame',
                'Keep it centered and fully visible',
                'Hold device parallel to surface',
            ],
        },
        {
            title: 'Real-time Guidance',
            icon: 'eye-check',
            content: [
                'Green border = Perfect alignment',
                'Red border = Adjustment needed',
                'Wait for auto-capture or tap manually',
            ],
        },
        {
            title: 'Review & Analyze',
            icon: 'microscope',
            content: [
                'Check image quality',
                'Verify calculated concentration',
                'Add notes and save result',
            ],
        },
    ];

    return (
        <View style={styles.mainContainer}>
            {/* Background Decoration */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />

            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
                                <Icon name="arrow-left" size={28} color="#1e293b" />
                            </TouchableOpacity>
                            <Text style={styles.title}>User Guide</Text>
                            <Text style={styles.subtitle}>
                                Master the scanning workflow in 5 simple steps.
                            </Text>
                        </View>

                        <View style={styles.timelineContainer}>
                            {/* Vertical Line */}
                            <View style={styles.verticalLine} />

                            {steps.map((step, index) => (
                                <View key={index} style={styles.stepRow}>
                                    <View style={styles.timelineMarker}>
                                        <LinearGradient
                                            colors={['#3b82f6', '#2563eb']}
                                            style={styles.markerCircle}
                                        >
                                            <Icon name={step.icon} size={20} color="#fff" />
                                        </LinearGradient>
                                    </View>

                                    <View style={styles.stepContent}>
                                        <View style={styles.stepCard}>
                                            <Text style={styles.stepTitle}>{index + 1}. {step.title}</Text>
                                            {step.content.map((item, i) => (
                                                <View key={i} style={styles.bulletItem}>
                                                    <View style={styles.bulletPoint} />
                                                    <Text style={styles.stepText}>{item}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <LinearGradient colors={['#eff6ff', '#bfdbfe']} style={styles.tipsCard}>
                            <View style={styles.tipsHeader}>
                                <Icon name="lightbulb-on" size={24} color="#d97706" />
                                <Text style={styles.tipsTitle}>Pro Tips</Text>
                            </View>
                            <Text style={styles.tipItem}>• Use <Text style={styles.bold}>Auto-Capture</Text> for the most stable and sharp images.</Text>
                            <Text style={styles.tipItem}>• Avoid shadows falling directly on the cassette window.</Text>
                            <Text style={styles.tipItem}>• Ensure internet connection for seamless uploads.</Text>
                        </LinearGradient>

                        <View style={{ height: 40 }} />
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
        top: verticalScale(-100),
        right: scale(-100),
        width: moderateScale(300),
        height: moderateScale(300),
        borderRadius: moderateScale(150),
        backgroundColor: '#e0f2fe',
        opacity: 0.5,
    },
    bgCircle2: {
        position: 'absolute',
        bottom: verticalScale(50),
        left: scale(-100),
        width: moderateScale(250),
        height: moderateScale(250),
        borderRadius: moderateScale(125),
        backgroundColor: '#f0fdf4',
        opacity: 0.5,
    },
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: moderateScale(24),
    },
    header: {
        marginBottom: verticalScale(32),
    },
    title: {
        fontSize: moderateScale(32),
        fontWeight: '800',
        color: '#1e293b',
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: moderateScale(16),
        color: '#64748b',
        marginTop: verticalScale(8),
        lineHeight: moderateScale(24),
    },
    timelineContainer: {
        position: 'relative',
        marginBottom: verticalScale(24),
    },
    verticalLine: {
        position: 'absolute',
        left: moderateScale(20),
        top: verticalScale(20),
        bottom: verticalScale(20),
        width: 2,
        backgroundColor: '#e2e8f0',
        borderRadius: 1,
    },
    stepRow: {
        flexDirection: 'row',
        marginBottom: verticalScale(24),
    },
    timelineMarker: {
        width: moderateScale(42),
        alignItems: 'center',
        zIndex: 10,
    },
    markerCircle: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    stepContent: {
        flex: 1,
        marginLeft: moderateScale(16),
    },
    stepCard: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: moderateScale(16),
        padding: moderateScale(16),
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    stepTitle: {
        fontSize: moderateScale(17),
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: verticalScale(12),
    },
    bulletItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: verticalScale(6),
    },
    bulletPoint: {
        width: moderateScale(6),
        height: moderateScale(6),
        borderRadius: moderateScale(3),
        backgroundColor: '#94a3b8',
        marginTop: verticalScale(7),
        marginRight: moderateScale(8),
    },
    stepText: {
        fontSize: moderateScale(14),
        color: '#475569',
        lineHeight: moderateScale(20),
        flex: 1,
    },
    tipsCard: {
        padding: moderateScale(20),
        borderRadius: moderateScale(20),
        marginTop: verticalScale(8),
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(12),
        gap: moderateScale(8),
    },
    tipsTitle: {
        fontSize: moderateScale(18),
        fontWeight: '800',
        color: '#0f172a',
    },
    tipItem: {
        fontSize: moderateScale(14),
        color: '#334155',
        marginBottom: verticalScale(8),
        lineHeight: moderateScale(22),
    },
    bold: {
        fontWeight: '700',
    },
});