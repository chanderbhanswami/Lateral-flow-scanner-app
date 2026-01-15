import React from 'react';
import { TextInput, StyleSheet, Text, View, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, style, ...props }) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    isFocused && styles.inputFocused,
                    error && styles.inputError,
                    style
                ]}
                placeholderTextColor="#9ca3af"
                onFocus={(e) => {
                    setIsFocused(true);
                    props.onFocus?.(e);
                }}
                onBlur={(e) => {
                    setIsFocused(false);
                    props.onBlur?.(e);
                }}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            {helperText && !error && <Text style={styles.helperText}>{helperText}</Text>}
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
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
        backgroundColor: '#fff',
    },
    inputFocused: {
        borderColor: '#3b82f6',
        borderWidth: 1.5,
    },
    inputError: {
        borderColor: '#ef4444',
    },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
    },
    helperText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
});