import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { moderateScale, verticalScale } from '../../utils/responsive';

interface TermsModalProps {
    isVisible: boolean;
    onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isVisible, onClose }) => {
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
                    <Text style={styles.title}>Terms of Service</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon name="close" size={24} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={styles.text}>
                        Last Updated: January 2026{'\n\n'}
                        Please read these Terms of Service ("Terms") carefully before using the Lateral Flow Scanner mobile application.{'\n\n'}

                        <Text style={styles.bold}>1. Acceptance of Terms</Text>{'\n'}
                        By accessing or using our App, you agree to be bound by these Terms.{'\n\n'}

                        <Text style={styles.bold}>2. Medical Disclaimer</Text>{'\n'}
                        This App is for informational and record-keeping purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment.{'\n\n'}

                        <Text style={styles.bold}>3. User Accounts</Text>{'\n'}
                        You are responsible for safeguarding the password that you use to access the App and for any activities or actions under your password.{'\n\n'}

                        <Text style={styles.bold}>4. Privacy</Text>{'\n'}
                        Your use of the App is also governed by our Privacy Policy.{'\n\n'}

                        <Text style={styles.bold}>5. Changes to Terms</Text>{'\n'}
                        We reserve the right to modify or replace these Terms at any time.
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
        borderTopLeftRadius: moderateScale(20),
        borderTopRightRadius: moderateScale(20),
        height: '80%',
        padding: moderateScale(20),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(20),
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: verticalScale(15),
    },
    title: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: '#1f2937',
    },
    content: {
        flex: 1,
    },
    text: {
        fontSize: moderateScale(16),
        lineHeight: verticalScale(24),
        color: '#4b5563',
        marginBottom: verticalScale(20),
    },
    bold: {
        fontWeight: '700',
        color: '#111827',
    },
    button: {
        backgroundColor: '#3b82f6',
        padding: moderateScale(16),
        borderRadius: moderateScale(12),
        alignItems: 'center',
        marginTop: verticalScale(10),
    },
    buttonText: {
        color: 'white',
        fontSize: moderateScale(16),
        fontWeight: '600',
    },
});
