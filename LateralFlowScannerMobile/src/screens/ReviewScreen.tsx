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

export const ReviewScreen: React.FC = () => {
    const navigation = useNavigation<ReviewScreenProps['navigation']>();
    const route = useRoute<ReviewScreenProps['route']>();

    // Defensive check for route params
    const captureData = route.params?.captureData;
    const imageUri = route.params?.imageUri;

    const { uploadCapture, isUploading } = useCapture();
    const { batches } = useConcentrationBatch();
    const { extractExif, formatMetadata, exifData, isLoading: isMetadataLoading } = useMetadata();

    // All hooks must be called unconditionally (React rules)
    const [concentration, setConcentration] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedBatch, setSelectedBatch] = useState<any>(null);
    const [showBatchSelector, setShowBatchSelector] = useState(false);

    // Update state when captureData becomes available
    useEffect(() => {
        if (captureData) {
            setConcentration(captureData.concentration || '');
            setNotes(captureData.notes || '');
            const batch = batches.find(b => b.id === captureData.concentrationBatchId);
            if (batch) setSelectedBatch(batch);
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
            const updatedData = {
                ...captureData,
                concentration,
                concentrationBatchId: selectedBatch?.id || undefined,
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

    const handleBatchSelect = (batch: any) => {
        setSelectedBatch(batch);
        setShowBatchSelector(false);
        // Optional: auto-fill concentration value from batch if empty
        if (!concentration && batch.concentration) {
            setConcentration(batch.concentration);
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
            extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
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

            {/* Batch Selection */}
            <Card style={styles.inputCard}>
                <Text style={styles.inputLabel}>Concentration Batch</Text>
                <TouchableOpacity
                    style={styles.batchSelector}
                    onPress={() => setShowBatchSelector(true)}
                >
                    {selectedBatch ? (
                        <View style={styles.selectedBatchRow}>
                            <View style={[styles.batchColor, { backgroundColor: selectedBatch.color || '#3b82f6' }]} />
                            <Text style={styles.batchName}>{selectedBatch.name}</Text>
                            <Text style={styles.batchInfo}>({selectedBatch.concentration} {selectedBatch.unit})</Text>
                        </View>
                    ) : (
                        <Text style={styles.placeholderText}>Select a batch...</Text>
                    )}
                    <Text style={styles.changeLink}>Change</Text>
                </TouchableOpacity>
            </Card>

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

            {/* Concentration Input */}
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
            {/* Batch Selector Modal */}
            <BatchSelector
                visible={showBatchSelector}
                onClose={() => setShowBatchSelector(false)}
                onSelect={handleBatchSelect}
            />
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        padding: 16,
    },
    imageCard: {
        marginBottom: 16,
        padding: 0,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 300,
    },
    infoCard: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#1f2937',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    infoLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
    },
    inputCard: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        color: '#1f2937',
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
        backgroundColor: '#fff',
    },
    notesInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    warningCard: {
        marginBottom: 16,
        backgroundColor: '#fef3c7',
        borderColor: '#f59e0b',
        borderWidth: 1,
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#92400e',
    },
    warningText: {
        fontSize: 14,
        color: '#78350f',
        marginBottom: 4,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        marginBottom: 40,
    },
    button: {
        flex: 1,
        marginHorizontal: 8,
    },
    batchSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
    },
    selectedBatchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    batchColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    batchName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1f2937',
        marginRight: 8,
    },
    batchInfo: {
        fontSize: 14,
        color: '#6b7280',
    },
    placeholderText: {
        fontSize: 16,
        color: '#9ca3af',
    },
    changeLink: {
        fontSize: 14,
        color: '#3b82f6',
        fontWeight: '600',
    },
});