import * as crypto from 'crypto';

export const generateRandomToken = (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
};

export const hashString = (data: string): string => {
    return crypto.createHash('sha256').update(data).digest('hex');
};

export const encrypt = (text: string, key: string): string => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
};

export const decrypt = (text: string, key: string): string => {
    const parts = text.split(':');
    const ivHex = parts[0];
    const encryptedText = parts[1];

    if (!ivHex || !encryptedText) {
        throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

export const generateSecurePassword = (length: number = 16): string => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, charset.length);
        password += charset[randomIndex];
    }

    return password;
};