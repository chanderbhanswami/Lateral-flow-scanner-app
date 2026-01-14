import { useState } from 'react';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';

export const useImagePicker = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pickImage = async (): Promise<string | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const result: ImagePickerResponse = await launchImageLibrary({
                mediaType: 'photo',
                quality: 1,
                selectionLimit: 1,
            });

            if (result.didCancel) {
                return null;
            }

            if (result.errorCode) {
                setError(result.errorMessage || 'Failed to pick image');
                return null;
            }

            const asset = result.assets?.[0];
            if (!asset?.uri) {
                setError('No image selected');
                return null;
            }

            return asset.uri;
        } catch (err) {
            setError(String(err));
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        pickImage,
        isLoading,
        error,
    };
};