import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_CONFIG } from '../config/r2';
import { logger } from '../utils/logger';

class R2Service {
    async verifyConnection(): Promise<void> {
        try {
            const command = new ListObjectsV2Command({
                Bucket: R2_CONFIG.bucketName,
                MaxKeys: 1
            });
            await r2Client.send(command);
        } catch (error) {
            logger.error('Failed to connect to Cloudflare R2:', error);
            throw error;
        }
    }
    async uploadImage(
        key: string,
        buffer: Buffer,
        contentType: string
    ): Promise<{ url: string; key: string }> {
        try {
            const command = new PutObjectCommand({
                Bucket: R2_CONFIG.bucketName,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                CacheControl: 'public, max-age=31536000',
            });

            await r2Client.send(command);

            const url = `${R2_CONFIG.publicUrl}/${key}`;

            logger.info(`Image uploaded to R2: ${key}`);

            return { url, key };
        } catch (error) {
            logger.error('R2 upload error:', error);
            throw new Error('Failed to upload image');
        }
    }

    async deleteImage(key: string): Promise<void> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: R2_CONFIG.bucketName,
                Key: key,
            });

            await r2Client.send(command);

            logger.info(`Image deleted from R2: ${key}`);
        } catch (error) {
            logger.error('R2 delete error:', error);
            throw new Error('Failed to delete image');
        }
    }

    async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
        try {
            const command = new GetObjectCommand({
                Bucket: R2_CONFIG.bucketName,
                Key: key,
            });

            const url = await getSignedUrl(r2Client, command, { expiresIn });

            return url;
        } catch (error) {
            logger.error('R2 signed URL error:', error);
            throw new Error('Failed to generate signed URL');
        }
    }

    async getObject(key: string): Promise<Buffer> {
        try {
            const command = new GetObjectCommand({
                Bucket: R2_CONFIG.bucketName,
                Key: key,
            });

            const response = await r2Client.send(command);
            const stream = response.Body as any;

            const chunks: Buffer[] = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            return Buffer.concat(chunks);
        } catch (error) {
            logger.error('R2 get object error:', error);
            throw new Error('Failed to get object');
        }
    }
}

export const r2Service = new R2Service();