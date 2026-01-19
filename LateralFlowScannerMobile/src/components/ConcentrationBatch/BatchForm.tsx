import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Text, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ConcentrationBatch } from '../../types';
import { Button } from '../UI/Button';
import { validateConcentrationBatch } from '../../utils/validation';

interface BatchFormProps {
    batch?: ConcentrationBatch;
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export const BatchForm: React.FC<BatchFormProps> = ({ batch, onSubmit, onCancel }) => {
    const [name, setName] = useState(batch?.name || '');
    const [concentration, setConcentration] = useState(batch?.concentration || '');
    const [unit, setUnit] = useState(batch?.unit || 'mg/mL');
    const [description, setDescription] = useState(batch?.description || '');
    const [color, setColor] = useState(batch?.color || '#3b82f6');
    const [errors, setErrors] = useState<any>({});

    const handleSubmit = () => {
        const data = { name, concentration, unit, description, color };
        const result = validateConcentrationBatch(data);

        if (!result.success) {
            const fieldErrors: any = {};
            result.error?.issues.forEach((err) => {
                const field = err.path[0];
                fieldErrors[field] = err.message;
            });
            setErrors(fieldErrors);
            return;
        }

        setErrors({});
        onSubmit(data);
    };

    return (
        <KeyboardAwareScrollView
            style={styles.container}
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
            enableAutomaticScroll={true}
            keyboardShouldPersistTaps="handled"
        >
            <Text style={styles.title}>{batch ? 'Edit Batch' : 'New Batch'}</Text>

            <View style={styles.field}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., High Concentration"
                    placeholderTextColor="#9ca3af"
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Concentration *</Text>
                <TextInput
                    style={[styles.input, errors.concentration && styles.inputError]}
                    value={concentration}
                    onChangeText={setConcentration}
                    placeholder="e.g., 100"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                />
                {errors.concentration && <Text style={styles.errorText}>{errors.concentration}</Text>}
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Unit *</Text>
                <TextInput
                    style={[styles.input, errors.unit && styles.inputError]}
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="e.g., mg/mL"
                    placeholderTextColor="#9ca3af"
                />
                {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Optional description"
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Color</Text>
                <TextInput
                    style={[styles.input, errors.color && styles.inputError]}
                    value={color}
                    onChangeText={setColor}
                    placeholder="#3b82f6"
                    placeholderTextColor="#9ca3af"
                />
                <View style={[styles.colorPreview, { backgroundColor: color }]} />
                {errors.color && <Text style={styles.errorText}>{errors.color}</Text>}
            </View>

            <View style={styles.buttons}>
                <Button title="Cancel" onPress={onCancel} variant="outline" style={styles.button} />
                <Button title="Save" onPress={handleSubmit} style={styles.button} />
            </View>
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1, // Fill the available modal space
        width: '100%',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingVertical: 15,
        justifyContent: 'center', // Center content vertically if space allows
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        alignSelf: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        alignSelf: 'center',
        marginTop: 4,
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        gap: 6,
    },
    // Legacy support for JSX
    field: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
        minHeight: 48, // Ensure touch target
    },
    inputError: {
        borderColor: '#ef4444',
    },
    multilineInput: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfInput: {
        flex: 1,
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#f3f4f6',
    },
    submitButton: {
        backgroundColor: '#10b981',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4b5563',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
    },
    colorPreview: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
});