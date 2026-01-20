import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Dimensions, Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useConcentrationBatch } from '../hooks/useConcentrationBatch';
import { BatchList } from '../components/ConcentrationBatch/BatchList';
import { BatchForm } from '../components/ConcentrationBatch/BatchForm';
import { Modal } from '../components/UI/Modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
import { moderateScale, verticalScale, scale } from '../utils/responsive';

export const ConcentrationManagementScreen: React.FC = () => {
    const navigation = useNavigation();
    const { batches, createBatch, updateBatch, deleteBatch } = useConcentrationBatch();
    const [showForm, setShowForm] = useState(false);
    const [editingBatch, setEditingBatch] = useState<any>(null);

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
        }).start();
    }, []);

    const handleCreate = async (data: any) => {
        await createBatch(data);
        setShowForm(false);
    };

    const handleUpdate = async (id: string, data: any) => {
        await updateBatch(id, data);
        setEditingBatch(null);
        setShowForm(false);
    };

    const handleDelete = async (id: string) => {
        await deleteBatch(id);
    };

    const handleEdit = (batch: any) => {
        setEditingBatch(batch);
        setShowForm(true);
    };

    return (
        <View style={styles.mainContainer}>
            {/* Background Decoration */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />

            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="arrow-left" size={28} color="#1e293b" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.title}>Batches</Text>
                            <Text style={styles.subtitle}>{batches.length} item{batches.length !== 1 ? 's' : ''}</Text>
                        </View>
                    </View>
                </View>

                <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                    <BatchList
                        batches={batches}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </Animated.View>

                {/* Floating Action Button */}
                <TouchableOpacity
                    style={styles.fabContainer}
                    activeOpacity={0.8}
                    onPress={() => setShowForm(true)}
                >
                    <LinearGradient
                        colors={['#3b82f6', '#2563eb']}
                        style={styles.fab}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Icon name="plus" size={28} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>

                <Modal
                    visible={showForm}
                    onClose={() => {
                        setShowForm(false);
                        setEditingBatch(null);
                    }}
                >
                    <BatchForm
                        batch={editingBatch}
                        onSubmit={(data) => {
                            if (editingBatch) {
                                handleUpdate(editingBatch.id, data);
                            } else {
                                handleCreate(data);
                            }
                        }}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingBatch(null);
                        }}
                    />
                </Modal>
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
        top: verticalScale(-50),
        left: scale(-50),
        width: moderateScale(250),
        height: moderateScale(250),
        borderRadius: moderateScale(125),
        backgroundColor: '#dbeafe', // Very light blue
        opacity: 0.5,
    },
    bgCircle2: {
        position: 'absolute',
        bottom: verticalScale(50),
        right: scale(-50),
        width: moderateScale(300),
        height: moderateScale(300),
        borderRadius: moderateScale(150),
        backgroundColor: '#f3e8ff', // Very light purple
        opacity: 0.5,
    },
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: moderateScale(24),
        paddingTop: verticalScale(16),
        paddingBottom: verticalScale(8),
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.5)',
    },
    title: {
        fontSize: moderateScale(28),
        fontWeight: '800',
        color: '#1e293b',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: moderateScale(14),
        color: '#64748b',
        marginTop: verticalScale(4),
        fontWeight: '500',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: moderateScale(16),
    },
    content: {
        flex: 1,
        paddingTop: verticalScale(16),
    },
    fabContainer: {
        position: 'absolute',
        bottom: verticalScale(32),
        right: scale(24),
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    fab: {
        width: moderateScale(64),
        height: moderateScale(64),
        borderRadius: moderateScale(32),
        justifyContent: 'center',
        alignItems: 'center',
    },
});