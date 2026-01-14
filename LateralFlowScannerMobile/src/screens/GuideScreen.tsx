import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { Card } from '../components/UI/Card';

export const GuideScreen: React.FC = () => {
    const steps = [
        {
            title: '1. Prepare Your Environment',
            content: [
                'Ensure good, even lighting',
                'Place cassette on flat, non-reflective surface',
                'Remove any obstacles around the cassette',
                'Clean the cassette window if needed',
            ],
        },
        {
            title: '2. Select Concentration Batch',
            content: [
                'Choose your concentration batch before scanning',
                'Or create a new batch on the fly',
                'This pre-fills concentration data for faster workflow',
            ],
        },
        {
            title: '3. Position the Cassette',
            content: [
                'Align cassette with the guide frame',
                'Keep cassette centered in the frame',
                'Ensure cassette is fully visible',
                'Hold device parallel to cassette surface',
            ],
        },
        {
            title: '4. Follow Real-time Guidance',
            content: [
                'Watch for warnings and recommendations',
                'Green border means optimal alignment',
                'Red border means adjustment needed',
                'Wait for auto-capture or tap manually',
            ],
        },
        {
            title: '5. Review and Submit',
            content: [
                'Check the captured image quality',
                'Verify or modify concentration',
                'Add notes if needed',
                'Send to save or cancel to retry',
            ],
        },
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>How to Use</Text>
            <Text style={styles.subtitle}>
                Follow these steps for optimal capture quality
            </Text>

            {steps.map((step, index) => (
                <Card key={index} style={styles.stepCard}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    {step.content.map((item, i) => (
                        <Text key={i} style={styles.stepItem}>
                            • {item}
                        </Text>
                    ))}
                </Card>
            ))}

            <Card style={styles.tipsCard}>
                <Text style={styles.tipsTitle}>💡 Tips for Best Results</Text>
                <Text style={styles.tipItem}>
                    • Use auto-capture for consistent quality
                </Text>
                <Text style={styles.tipItem}>
                    • Hold device steady during capture
                </Text>
                <Text style={styles.tipItem}>
                    • Avoid shadows and reflections
                </Text>
                <Text style={styles.tipItem}>
                    • Ensure internet connection for uploads
                </Text>
            </Card>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 24,
    },
    stepCard: {
        marginBottom: 16,
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },
    stepItem: {
        fontSize: 15,
        color: '#4b5563',
        marginBottom: 8,
        lineHeight: 22,
    },
    tipsCard: {
        backgroundColor: '#dbeafe',
        borderColor: '#3b82f6',
        borderWidth: 1,
        marginTop: 8,
    },
    tipsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e40af',
        marginBottom: 12,
    },
    tipItem: {
        fontSize: 15,
        color: '#1e3a8a',
        marginBottom: 8,
        lineHeight: 22,
    },
});