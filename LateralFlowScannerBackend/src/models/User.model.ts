import mongoose, { Document, Schema, Model, HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ==========================================
// User Interface
// ==========================================
export interface IUser {
    // Basic Info
    email: string;
    password?: string;
    name: string;
    avatar?: string;
    phone?: string;

    // Role & Status
    role: 'user' | 'admin';
    isActive: boolean;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;

    // OAuth Providers
    authProvider: 'email' | 'google' | 'facebook';
    googleId?: string;
    facebookId?: string;

    // OTP & Verification
    emailVerificationOTP?: string;
    emailVerificationOTPExpires?: Date;
    phoneVerificationOTP?: string;
    phoneVerificationOTPExpires?: Date;

    // Password Reset
    passwordResetToken?: string;
    passwordResetTokenExpires?: Date;

    // Session Management
    fcmTokens: string[];
    refreshTokens: Array<{
        token: string;
        deviceInfo: string;
        createdAt: Date;
        expiresAt: Date;
    }>;

    // Security
    lastLogin?: Date;
    lastPasswordChange?: Date;
    loginAttempts: number;
    lockUntil?: Date;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// ==========================================
// User Methods Interface
// ==========================================
export interface IUserMethods {
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateEmailVerificationOTP(): string;
    generatePhoneVerificationOTP(): string;
    generatePasswordResetToken(): string;
    isLocked(): boolean;
    incrementLoginAttempts(): Promise<void>;
    resetLoginAttempts(): Promise<void>;
}

// ==========================================
// User Document Type
// ==========================================
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

// ==========================================
// User Model Type
// ==========================================
type UserModel = Model<IUser, {}, IUserMethods>;

// ==========================================
// Constants
// ==========================================
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes
const RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

// ==========================================
// User Schema
// ==========================================
const UserSchema = new Schema<IUser, UserModel, IUserMethods>(
    {
        // Basic Info
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            select: false,
            minlength: [8, 'Password must be at least 8 characters'],
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        avatar: String,
        phone: { type: String, trim: true },

        // Role & Status
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        isActive: { type: Boolean, default: true },
        isEmailVerified: { type: Boolean, default: false },
        isPhoneVerified: { type: Boolean, default: false },

        // OAuth Providers
        authProvider: {
            type: String,
            enum: ['email', 'google', 'facebook'],
            default: 'email',
        },
        googleId: { type: String, sparse: true, index: true },
        facebookId: { type: String, sparse: true, index: true },

        // OTP & Verification
        emailVerificationOTP: { type: String, select: false },
        emailVerificationOTPExpires: { type: Date, select: false },
        phoneVerificationOTP: { type: String, select: false },
        phoneVerificationOTPExpires: { type: Date, select: false },

        // Password Reset
        passwordResetToken: { type: String, select: false },
        passwordResetTokenExpires: { type: Date, select: false },

        // Session Management
        fcmTokens: [{ type: String }],
        refreshTokens: [{
            token: { type: String, required: true },
            deviceInfo: { type: String, default: 'Unknown Device' },
            createdAt: { type: Date, default: Date.now },
            expiresAt: { type: Date, required: true },
        }],

        // Security
        lastLogin: Date,
        lastPasswordChange: Date,
        loginAttempts: { type: Number, default: 0 },
        lockUntil: Date,
    },
    { timestamps: true }
);

// ==========================================
// Indexes (only for composite or special indexes)
// ==========================================
// Note: email, googleId, facebookId already have index: true in schema
UserSchema.index({ 'refreshTokens.token': 1 });

// ==========================================
// Pre-save Middleware - Hash Password
// ==========================================
(UserSchema as any).pre('save', async function (this: IUser & Document, next: (err?: Error) => void): Promise<void> {
    // Only hash if password is modified and exists
    if (!this.isModified('password') || !this.password) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        this.lastPasswordChange = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

// ==========================================
// Instance Methods
// ==========================================

// Compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Generate 6-digit OTP for email verification
UserSchema.methods.generateEmailVerificationOTP = function (): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.emailVerificationOTP = crypto.createHash('sha256').update(otp).digest('hex');
    this.emailVerificationOTPExpires = new Date(Date.now() + OTP_EXPIRY);
    return otp;
};

// Generate 6-digit OTP for phone verification
UserSchema.methods.generatePhoneVerificationOTP = function (): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.phoneVerificationOTP = crypto.createHash('sha256').update(otp).digest('hex');
    this.phoneVerificationOTPExpires = new Date(Date.now() + OTP_EXPIRY);
    return otp;
};

// Generate password reset token
UserSchema.methods.generatePasswordResetToken = function (): string {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetTokenExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY);
    return resetToken;
};

// Check if account is locked
UserSchema.methods.isLocked = function (): boolean {
    return !!(this.lockUntil && this.lockUntil > new Date());
};

// Increment login attempts
UserSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
    // If previous lock has expired, reset attempts
    if (this.lockUntil && this.lockUntil < new Date()) {
        this.loginAttempts = 1;
        this.lockUntil = undefined;
        await this.save();
        return;
    }

    this.loginAttempts += 1;

    // Lock the account if max attempts reached
    if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        this.lockUntil = new Date(Date.now() + LOCK_TIME);
    }

    await this.save();
};

// Reset login attempts
UserSchema.methods.resetLoginAttempts = async function (): Promise<void> {
    this.loginAttempts = 0;
    this.lastLogin = new Date();
    this.lockUntil = undefined;
    await this.save();
};

// ==========================================
// Export Model
// ==========================================
export const User = mongoose.model<IUser, UserModel>('User', UserSchema);