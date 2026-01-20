import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Image,
    ActivityIndicator,
    Alert,
    Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ImagePicker from 'react-native-image-crop-picker';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth.api';
import { moderateScale, verticalScale, scale } from '../utils/responsive';

export const EditProfileScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { user, setUser } = useAuthStore();

    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);

    const handlePickImage = async () => {
        try {
            const image = await ImagePicker.openPicker({
                width: 500,
                height: 500,
                cropping: true,
                cropperCircleOverlay: true,
                mediaType: 'photo',
                includeBase64: false,
            });

            if (image.path) {
                await uploadAvatar(image.path, image.mime);
            }
        } catch (error: any) {
            if (error.code !== 'E_PICKER_CANCELLED') {
                console.error('Image picker error:', error);
                Toast.show({ type: 'error', text1: 'Failed to pick image' });
            }
        }
    };

    const uploadAvatar = async (uri: string, type: string) => {
        setAvatarLoading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', {
                uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                type: type,
                name: 'avatar.jpg',
            } as any);

            const response = await authApi.uploadAvatar(formData);

            // Update local user state
            if (user) {
                setUser({ ...user, avatar: response.data.avatar });
            }

            Toast.show({ type: 'success', text1: 'Profile photo updated' });
        } catch (error) {
            console.error('Upload avatar error:', error);
            Toast.show({ type: 'error', text1: 'Failed to upload photo' });
        } finally {
            setAvatarLoading(false);
        }
    };

    const handleDeleteAvatar = async () => {
        Alert.alert(
            'Remove Photo',
            'Are you sure you want to remove your profile photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        setAvatarLoading(true);
                        try {
                            await authApi.deleteAvatar();
                            if (user) {
                                setUser({ ...user, avatar: undefined });
                            }
                            Toast.show({ type: 'success', text1: 'Photo removed' });
                        } catch (error) {
                            console.error('Delete avatar error:', error);
                            Toast.show({ type: 'error', text1: 'Failed to remove photo' });
                        } finally {
                            setAvatarLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Toast.show({ type: 'error', text1: 'Name cannot be empty' });
            return;
        }

        setLoading(true);
        try {
            const updatedUser = await authApi.updateProfile({ name });
            setUser(updatedUser);
            Toast.show({ type: 'success', text1: 'Profile updated' });
            navigation.goBack();
        } catch (error) {
            console.error('Update profile error:', error);
            Toast.show({ type: 'error', text1: 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#3b82f6" />
                    ) : (
                        <Text style={styles.saveButton}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarContainer}>
                        {avatarLoading ? (
                            <ActivityIndicator size="large" color="#3b82f6" />
                        ) : user?.avatar ? (
                            <Image source={{ uri: user.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarPlaceholderText}>
                                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.cameraButton}
                            onPress={handlePickImage}
                        >
                            <Icon name="camera" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.avatarActions}>
                        <TouchableOpacity onPress={handlePickImage}>
                            <Text style={styles.changePhotoText}>Change Photo</Text>
                        </TouchableOpacity>
                        {user?.avatar && (
                            <TouchableOpacity onPress={handleDeleteAvatar} style={styles.removeButton}>
                                <Text style={styles.removePhotoText}>Remove</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Form Fields */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your name"
                            placeholderTextColor="#94a3b8"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, styles.disabledInput]}
                            value={user?.email}
                            editable={false}
                        />
                        <Text style={styles.helperText}>Email cannot be changed</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: moderateScale(20),
        paddingVertical: verticalScale(12),
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backButton: {
        padding: moderateScale(8),
        marginLeft: moderateScale(-8),
    },
    headerTitle: {
        fontSize: moderateScale(18),
        fontWeight: '700',
        color: '#1e293b',
    },
    saveButton: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        color: '#3b82f6',
        padding: moderateScale(8),
    },
    content: {
        flex: 1,
        padding: moderateScale(24),
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: verticalScale(32),
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: verticalScale(16),
    },
    avatar: {
        width: moderateScale(120),
        height: moderateScale(120),
        borderRadius: moderateScale(60),
        backgroundColor: '#f1f5f9',
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#3b82f6',
    },
    avatarPlaceholderText: {
        fontSize: moderateScale(48),
        fontWeight: 'bold',
        color: '#fff',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#3b82f6',
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#f8fafc',
    },
    avatarActions: {
        flexDirection: 'row',
        gap: moderateScale(16),
    },
    changePhotoText: {
        color: '#3b82f6',
        fontWeight: '600',
        fontSize: moderateScale(14),
    },
    removeButton: {
        marginLeft: moderateScale(16),
    },
    removePhotoText: {
        color: '#ef4444',
        fontWeight: '600',
        fontSize: moderateScale(14),
    },
    form: {
        gap: verticalScale(24),
    },
    inputGroup: {
        gap: verticalScale(8),
    },
    label: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: '#64748b',
        marginLeft: moderateScale(4),
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: moderateScale(12),
        padding: moderateScale(16),
        fontSize: moderateScale(16),
        color: '#1e293b',
    },
    disabledInput: {
        backgroundColor: '#f1f5f9',
        color: '#94a3b8',
    },
    helperText: {
        fontSize: moderateScale(12),
        color: '#94a3b8',
        marginLeft: moderateScale(4),
    },
});
