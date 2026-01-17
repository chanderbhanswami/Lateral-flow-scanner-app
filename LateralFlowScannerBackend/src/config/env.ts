import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment-specific .env file
const envFile = process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000').transform(Number),

    // Database
    MONGODB_URI: z.string(),
    POSTGRES_URI: z.string().optional(),

    // Redis
    REDIS_URL: z.string().optional(),
    UPSTASH_REDIS_URL: z.string().optional(),

    // Cloudflare R2
    R2_ACCOUNT_ID: z.string(),
    R2_ACCESS_KEY_ID: z.string(),
    R2_SECRET_ACCESS_KEY: z.string(),
    R2_BUCKET_NAME: z.string(),
    R2_PUBLIC_URL: z.string(),

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: z.string(),
    CLOUDINARY_API_KEY: z.string(),
    CLOUDINARY_API_SECRET: z.string(),

    // Kafka
    KAFKA_BROKERS: z.string(),
    KAFKA_CLIENT_ID: z.string().default('lateral-flow-backend'),

    // JWT
    JWT_SECRET: z.string(),
    JWT_EXPIRES_IN: z.string().default('7d'),
    JWT_REFRESH_SECRET: z.string(),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

    // CORS
    CORS_ORIGIN: z.string().default('*'),

    // Sentry
    SENTRY_DSN: z.string().optional(),

    // Email (optional)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().transform(Number).optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    SMTP_FROM_NAME: z.string().optional(),

    // Frontend
    FRONTEND_URL: z.string().default('http://localhost:3001'),

    // Operations (Security)
    INVITE_CODE: z.string().default('LATERAL_2024'),
    ADMIN_INVITE_CODE: z.string().default('ADMIN_LATERAL_2024'),

    // OAuth
    GOOGLE_CLIENT_ID: z.string().optional(),
    FACEBOOK_APP_ID: z.string().optional(),

    // Firebase (Notifications)
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
    FIREBASE_SERVICE_ACCOUNT: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

// Fallback to Upstash if REDIS_URL is missing
if (!parsed.data.REDIS_URL && parsed.data.UPSTASH_REDIS_URL) {
    parsed.data.REDIS_URL = parsed.data.UPSTASH_REDIS_URL;
}

if (!parsed.data.REDIS_URL) {
    console.warn('⚠️ No REDIS_URL or UPSTASH_REDIS_URL provided. Caching may not work.');
}

export const config = parsed.data;