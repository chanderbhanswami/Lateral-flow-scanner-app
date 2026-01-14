import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { InstructionCard } from './InstructionCard';

interface GuideOverlayProps {
    visible: boolean;
    onClose: () => void;
}

export const GuideOverlay: React.FC<GuideOverlayProps> = ({ visible, onClose }) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Capture Guide</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <InstructionCard
                            icon="lightbulb-on"
                            title="Good Lighting"
                            description="Ensure adequate lighting. Avoid direct sunlight or harsh shadows."
                            type="info"
                        />

                        <InstructionCard
                            icon="crop-free"
                            title="Align Object"
                            description="Position the test cassette within the guide frame."
                            type="info"
                        />

                        <InstructionCard
                            icon="cellphone-wireless"
                            title="Hold Steady"
                            description="Keep your device steady to avoid blurry images."
                            type="warning"
                        />

                        <InstructionCard
                            icon="check-circle"
                            title="Auto-Capture"
                            description="The app will automatically capture when conditions are optimal."
                            type="success"
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
    },
    content: {
        padding: 20,
    },
});