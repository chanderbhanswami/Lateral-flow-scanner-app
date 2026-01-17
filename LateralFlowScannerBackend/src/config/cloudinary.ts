import { v2 as cloudinary } from 'cloudinary';
import { config } from './env';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary
 * @param filePath Local path to the file
 * @param folder Cloudinary folder name (default: 'profiles')
 * @returns Upload result or throws error
 */
export const uploadImage = async (filePath: string, folder: string = 'profiles') => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: `lateral-flow/${folder}`,
            use_filename: true,
            unique_filename: true,
            resource_type: 'image',
            transformation: [
                { width: 500, height: 500, crop: 'limit' }, // Optimize size, keep aspect ratio max 500x500
                { quality: 'auto' }, // Auto optimize quality
                { fetch_format: 'auto' } // Auto select best format (webp/avif)
            ]
        });

        // Remove local file after upload
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return result;
    } catch (error) {
        // Remove local file if upload fails
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw error;
    }
};

/**
 * Delete an image from Cloudinary
 * @param publicId Cloudinary public ID
 */
export const deleteImage = async (publicId: string) => {
    try {
        if (!publicId) return;
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw error;
    }
};

/**
 * Extract public ID from Cloudinary URL
 * @param url Cloudinary image URL
 */
export const getPublicIdFromUrl = (url: string): string | null => {
    try {
        if (!url) return null;
        // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/lateral-flow/profiles/my_image.jpg
        const parts = url.split('/');
        const filenameWithExt = parts[parts.length - 1];
        if (!filenameWithExt) return null; // Guard against undefined

        const filename = filenameWithExt.split('.')[0];
        const folder = parts[parts.length - 2];
        const parentFolder = parts[parts.length - 3];

        // Adjust logic based on your folder structure defined in uploadImage
        // Here assuming structure like .../lateral-flow/profiles/filename
        if (parentFolder === 'lateral-flow') {
            return `${parentFolder}/${folder}/${filename}`;
        }

        // Fallback for simple structure
        return filename || null;
    } catch (error) {
        return null;
    }
};

export default cloudinary;
