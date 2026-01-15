import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface PrivacyModalProps {
    isVisible: boolean;
    onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isVisible, onClose }) => {
    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            onBackButtonPress={onClose}
            style={styles.modal}
            backdropOpacity={0.5}
            animationIn="slideInUp"
            animationOut="slideOutDown"
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Privacy Policy</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon name="close" size={24} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={styles.text}>
                        Last Updated: January 2026{'\n\n'}

                        <Text style={styles.bold}>1. Information We Collect</Text>{'\n'}
                        We collect information you provide directly to us, such as when you create an account, upload images, or communicate with us.{'\n\n'}

                        <Text style={styles.bold}>2. How We Use Your Information</Text>{'\n'}
                        We use the information we collect to provide, maintain, and improve our services, including processing your lateral flow test captures.{'\n\n'}

                        <Text style={styles.bold}>3. Data Security</Text>{'\n'}
                        We implement appropriate technical and organizational measures to protect specific personal data.{'\n\n'}

                        <Text style={styles.bold}>4. Image Data</Text>{'\n'}
                        Images you upload are processed securely. We do not share your medical data with third parties without your explicit consent.{'\n\n'}

                        <Text style={styles.bold}>5. Contact Us</Text>{'\n'}
                        If you have any questions about this Privacy Policy, please contact us.
                    </Text>
                </ScrollView>

                <TouchableOpacity style={styles.button} onPress={onClose}>
                    <Text style={styles.buttonText}>I Understand</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    container: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '80%',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 15,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
    },
    content: {
        flex: 1,
    },
    text: {
        fontSize: 16,
        lineHeight: 24,
        color: '#4b5563',
        marginBottom: 20,
    },
    bold: {
        fontWeight: '700',
        color: '#111827',
    },
    button: {
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
