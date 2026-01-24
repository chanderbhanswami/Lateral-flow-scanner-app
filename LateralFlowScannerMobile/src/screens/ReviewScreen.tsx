import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Image, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { ReviewScreenProps } from '../types';
import { useCapture } from '../hooks/useCapture';
import { useMetadata } from '../hooks/useMetadata';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { Input } from '../components/UI/Input';
import { useConcentrationBatch } from '../hooks/useConcentrationBatch';
import { BatchSelector } from '../components/ConcentrationBatch/BatchSelector';
import { logger } from '../utils/logger';
import { moderateScale, verticalScale, scale } from '../utils/responsive';

export const ReviewScreen: React.FC = () => {
    const navigation = useNavigation<ReviewScreenProps['navigation']>();
    const route = useRoute<ReviewScreenProps['route']>();

    // Defensive check for route params
    const captureData = route.params?.captureData;
    const imageUri = route.params?.imageUri;

    const { uploadCapture, isUploading } = useCapture();
    const { batches, createBatch } = useConcentrationBatch();
    const { extractExif, formatMetadata, exifData, isLoading: isMetadataLoading } = useMetadata();

    // All hooks must be called unconditionally (React rules)
    const [concentration, setConcentration] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedBatch, setSelectedBatch] = useState<any>(null);

    // Update state when captureData becomes available
    useEffect(() => {
        if (captureData) {
            setConcentration(captureData.concentration || '');
            setNotes(captureData.notes || '');
            const batch = batches.find(b => b.id === captureData.concentrationBatchId);
            if (batch) {
                setSelectedBatch(batch);
                // Auto-fill concentration if it was empty, or ensure it matches batch if that's desired behavior
                if (!captureData.concentration && batch.concentration) {
                    setConcentration(String(batch.concentration));
                }
            }
        }
    }, [captureData, batches]);

    // Extract EXIF on mount
    useEffect(() => {
        if (imageUri) {
            extractExif(imageUri);
        }
    }, [imageUri, extractExif]);

    // If params are missing, show error and go back
    if (!captureData || !imageUri) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 18, color: '#ef4444', marginBottom: 16 }}>Error: Missing capture data</Text>
                <TouchableOpacity
                    style={{ backgroundColor: '#3b82f6', padding: 12, borderRadius: 8 }}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleSend = async () => {
        try {
            let finalBatchId = selectedBatch?.id;
            const cleanConcentration = concentration.trim();

            // Smart Batch Logic: Check if value matches selected batch
            const currentBatchValue = selectedBatch ? String(selectedBatch.concentration) : '';

            if (cleanConcentration && cleanConcentration !== currentBatchValue) {
                // Value changed! 
                // 1. Try to find existing batch with this value
                const existingBatch = batches.find(b => String(b.concentration) === cleanConcentration);

                if (existingBatch) {
                    console.log('Found existing batch matching value:', cleanConcentration);
                    finalBatchId = existingBatch.id;
                } else {
                    // 2. Auto-Create New Batch
                    console.log('Creating new batch for value:', cleanConcentration);
                    try {
                        const newBatch = await createBatch({
                            name: cleanConcentration,
                            concentration: cleanConcentration || '0',
                            unit: 'mg/ml', // Default unit
                            notes: cleanConcentration, // As requested: notes = value
                            color: '#eab308' // Default 'New' color (Yellow-ish)
                        });

                        if (newBatch && newBatch.id) {
                            finalBatchId = newBatch.id;
                            console.log('Created new batch:', newBatch.id);
                        }
                    } catch (createErr) {
                        console.error('Failed to auto-create batch:', createErr);
                        Toast.show({
                            type: 'error',
                            text1: 'Batch Creation Failed',
                            text2: 'Saving without batch link',
                        });
                        finalBatchId = undefined;
                    }
                }
            }

            const updatedData = {
                ...captureData,
                concentration: cleanConcentration,
                concentrationBatchId: finalBatchId || undefined,
                notes,
                exifData: exifData || captureData.exifData, // Include extracted EXIF
            };

            await uploadCapture(updatedData, imageUri);

            Toast.show({
                type: 'success',
                text1: 'Upload successful',
                text2: 'Capture has been saved',
            });

            navigation.navigate('Capture');
        } catch (error) {
            logger.error('Upload error', error);
            Toast.show({
                type: 'error',
                text1: 'Upload failed',
                text2: String(error),
            });
        }
    };

    const handleCancel = () => {
        navigation.goBack();
    };

    return (
        <KeyboardAwareScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'ios' ? verticalScale(20) : verticalScale(100)}
            enableAutomaticScroll={true}
        >
            {/* Image Preview */}
            <Card style={styles.imageCard}>
                <Image
                    source={{ uri: `file://${imageUri}` }}
                    style={styles.image}
                    resizeMode="contain"
                />
            </Card>

            {/* Display Selected Batch Info (Read-only) if exists */}
            {selectedBatch && (
                <Card style={styles.infoCard}>
                    <Text style={styles.sectionTitle}>Selected Batch</Text>
                    <View style={styles.selectedBatchRow}>
                        <View style={[styles.batchColor, { backgroundColor: selectedBatch.color || '#3b82f6' }]} />
                        <Text style={styles.batchName}>{selectedBatch.name}</Text>
                        <Text style={styles.batchInfo}>({selectedBatch.concentration} {selectedBatch.unit})</Text>
                    </View>
                </Card>
            )}

            {/* Capture Info */}
            <Card style={styles.infoCard}>
                <Text style={styles.sectionTitle}>Capture Information</Text>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mode:</Text>
                    <Text style={styles.infoValue}>{captureData.captureMode}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Quality Score:</Text>
                    <Text style={styles.infoValue}>
                        {(captureData.analysisData?.qualityScore ?? 0).toFixed(1)}/100
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Timestamp:</Text>
                    <Text style={styles.infoValue}>
                        {new Date(captureData.timestamp).toLocaleString()}
                    </Text>
                </View>
            </Card>

            {/* Concentration Input - ALWAYS VISIBLE */}
            <Card style={styles.inputCard}>
                <Input
                    label="Concentration Value *"
                    value={concentration}
                    onChangeText={setConcentration}
                    placeholder="Enter concentration value (e.g. 10)"
                    keyboardType="numeric"
                />
            </Card>

            {/* Notes Input */}
            <Card style={styles.inputCard}>
                <Input
                    label="Notes (Optional)"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add any notes..."
                    multiline
                    numberOfLines={4}
                    style={styles.notesInput}
                />
            </Card>

            {/* Warnings */}
            {(captureData.analysisData?.warnings?.length ?? 0) > 0 && (
                <Card style={styles.warningCard}>
                    <Text style={styles.warningTitle}>Warnings</Text>
                    {(captureData.analysisData?.warnings ?? []).map((warning, index) => (
                        <Text key={index} style={styles.warningText}>
                            • {warning}
                        </Text>
                    ))}
                </Card>
            )}

            {/* Detailed Analysis Report */}
            {captureData.analysisData && (
                <Card style={styles.infoCard}>
                    <Text style={styles.sectionTitle}>Analysis Report</Text>

                    {/* Exposure */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Exposure:</Text>
                        <Text style={styles.infoValue}>
                            {captureData.analysisData.exposureAnalysis?.isUnderexposed ? 'Underexposed' :
                                captureData.analysisData.exposureAnalysis?.isOverexposed ? 'Overexposed' : 'Good'}
                        </Text>
                    </View>

                    {/* Blur */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Focus Score:</Text>
                        <Text style={styles.infoValue}>
                            {captureData.analysisData.blurAnalysis?.isBlurry ? 'Blurry' : 'Sharp'}
                            {captureData.analysisData.blurAnalysis?.laplacianVariance ?
                                ` (${captureData.analysisData.blurAnalysis.laplacianVariance.toFixed(0)})` : ''}
                        </Text>
                    </View>

                    {/* Shadows */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Shadows:</Text>
                        <Text style={styles.infoValue}>
                            {captureData.analysisData.shadowAnalysis?.hasShadow ?
                                `Detected (${(captureData.analysisData.shadowAnalysis.shadowCoverage * 100).toFixed(0)}%)` :
                                'None'}
                        </Text>
                    </View>

                    {/* Glare */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Glare:</Text>
                        <Text style={styles.infoValue}>
                            {captureData.analysisData.reflectionAnalysis?.hasReflection ?
                                `Detected (${(captureData.analysisData.reflectionAnalysis.affectedArea * 100).toFixed(0)}%)` :
                                'None'}
                        </Text>
                    </View>

                    {/* Recommendations */}
                    {(captureData.analysisData.recommendations?.length ?? 0) > 0 && (
                        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                            <Text style={[styles.infoLabel, { marginBottom: 4 }]}>Recommendations:</Text>
                            {captureData.analysisData.recommendations.map((rec: string, i: number) => (
                                <Text key={i} style={[styles.infoValue, { color: '#059669', marginBottom: 2 }]}>• {rec}</Text>
                            ))}
                        </View>
                    )}
                </Card>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
                <Button
                    title="Cancel"
                    onPress={handleCancel}
                    variant="outline"
                    style={styles.button}
                    disabled={isUploading}
                />
                <Button
                    title={isUploading ? 'Sending...' : 'Send'}
                    onPress={handleSend}
                    style={styles.button}
                    disabled={isUploading || !concentration}
                    loading={isUploading}
                />
            </View>
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        padding: moderateScale(16),
        paddingBottom: verticalScale(40),
        flexGrow: 1,
    },
    imageCard: {
        marginBottom: verticalScale(16),
        padding: 0,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: verticalScale(300),
    },
    infoCard: {
        marginBottom: verticalScale(16),
    },
    sectionTitle: {
        fontSize: moderateScale(18),
        fontWeight: '600',
        marginBottom: verticalScale(12),
        color: '#1f2937',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: verticalScale(8),
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    infoLabel: {
        fontSize: moderateScale(14),
        color: '#6b7280',
    },
    infoValue: {
        fontSize: moderateScale(14),
        fontWeight: '500',
        color: '#1f2937',
    },
    inputCard: {
        marginBottom: verticalScale(16),
    },
    inputLabel: {
        fontSize: moderateScale(14),
        fontWeight: '500',
        marginBottom: verticalScale(8),
        color: '#1f2937',
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: moderateScale(8),
        padding: moderateScale(12),
        fontSize: moderateScale(16),
        color: '#1f2937',
        backgroundColor: '#fff',
    },
    notesInput: {
        height: verticalScale(100),
        textAlignVertical: 'top',
    },
    warningCard: {
        marginBottom: verticalScale(16),
        backgroundColor: '#fef3c7',
        borderColor: '#f59e0b',
        borderWidth: 1,
    },
    warningTitle: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        marginBottom: verticalScale(8),
        color: '#92400e',
    },
    warningText: {
        fontSize: moderateScale(14),
        color: '#78350f',
        marginBottom: verticalScale(4),
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: verticalScale(16),
        marginBottom: verticalScale(40),
    },
    button: {
        flex: 1,
        marginHorizontal: moderateScale(8),
    },
    batchSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: moderateScale(12),
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: moderateScale(8),
    },
    selectedBatchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    batchColor: {
        width: moderateScale(12),
        height: moderateScale(12),
        borderRadius: moderateScale(6),
        marginRight: moderateScale(8),
    },
    batchName: {
        fontSize: moderateScale(16),
        fontWeight: '500',
        color: '#1f2937',
        marginRight: moderateScale(8),
    },
    batchInfo: {
        fontSize: moderateScale(14),
        color: '#6b7280',
    },
    placeholderText: {
        fontSize: moderateScale(16),
        color: '#9ca3af',
    },
    changeLink: {
        fontSize: moderateScale(14),
        color: '#3b82f6',
        fontWeight: '600',
    },
});