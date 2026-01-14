import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface SelectProps {
    label?: string;
    value: string;
    options: Array<{ label: string; value: string }>;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
}

export const Select: React.FC<SelectProps> = ({
    label,
    value,
    options,
    onChange,
    placeholder = 'Select...',
    error,
}) => {
    const [visible, setVisible] = useState(false);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}

            <TouchableOpacity
                style={[styles.select, error && styles.selectError]}
                onPress={() => setVisible(true)}
            >
                <Text style={[styles.selectText, !selectedOption && styles.placeholder]}>
                    {selectedOption?.label || placeholder}
                </Text>
                <Icon name="chevron-down" size={24} color="#6b7280" />
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{label || 'Select'}</Text>
                            <TouchableOpacity onPress={() => setVisible(false)}>
                                <Icon name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.option,
                                        item.value === value && styles.optionSelected,
                                    ]}
                                    onPress={() => {
                                        onChange(item.value);
                                        setVisible(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            item.value === value && styles.optionTextSelected,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    {item.value === value && (
                                        <Icon name="check" size={20} color="#3b82f6" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    select: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
    },
    selectError: {
        borderColor: '#ef4444',
    },
    selectText: {
        fontSize: 16,
        color: '#1f2937',
    },
    placeholder: {
        color: '#9ca3af',
    },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '80%',
        maxHeight: '60%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    option: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    optionSelected: {
        backgroundColor: '#eff6ff',
    },
    optionText: {
        fontSize: 16,
        color: '#1f2937',
    },
    optionTextSelected: {
        color: '#3b82f6',
        fontWeight: '500',
    },
});