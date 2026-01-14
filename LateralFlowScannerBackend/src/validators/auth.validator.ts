import { z } from 'zod';

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;

// Email schema
const emailSchema = z.string().email('Invalid email address').toLowerCase().trim();

// Password schema with strong validation
const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .refine(
        (val) => passwordRegex.test(val),
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    );

// Simple password schema (for login, where we don't need to enforce rules)
const simplePasswordSchema = z.string().min(1, 'Password is required');

// Name schema
const nameSchema = z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim();

// ==========================================
// Registration Schema
// ==========================================
export const registerSchema = z.object({
    body: z.object({
        email: emailSchema,
        password: passwordSchema,
        name: nameSchema,
    }),
});

// ==========================================
// Login Schema
// ==========================================
export const loginSchema = z.object({
    body: z.object({
        email: emailSchema,
        password: simplePasswordSchema,
    }),
});

// ==========================================
// Google OAuth Schema
// ==========================================
export const googleAuthSchema = z.object({
    body: z.object({
        idToken: z.string().min(1, 'Google ID token is required'),
        accessToken: z.string().optional(),
    }),
});

// ==========================================
// Facebook OAuth Schema
// ==========================================
export const facebookAuthSchema = z.object({
    body: z.object({
        accessToken: z.string().min(1, 'Facebook access token is required'),
        email: emailSchema.optional(),
        name: z.string().optional(),
        picture: z.string().url().optional(),
    }),
});

// ==========================================
// Email Verification Schema
// ==========================================
export const verifyEmailSchema = z.object({
    body: z.object({
        email: emailSchema,
        otp: z.string()
            .length(6, 'OTP must be 6 digits')
            .regex(/^\d{6}$/, 'OTP must contain only digits'),
    }),
});

// ==========================================
// Forgot Password Schema
// ==========================================
export const forgotPasswordSchema = z.object({
    body: z.object({
        email: emailSchema,
    }),
});

// ==========================================
// Reset Password Schema
// ==========================================
export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(1, 'Reset token is required'),
        password: passwordSchema,
    }),
});

// ==========================================
// Reset Password with OTP Schema
// ==========================================
export const resetPasswordOTPSchema = z.object({
    body: z.object({
        email: emailSchema,
        otp: z.string()
            .length(6, 'OTP must be 6 digits')
            .regex(/^\d{6}$/, 'OTP must contain only digits'),
        newPassword: passwordSchema,
    }),
});

// ==========================================
// Change Password Schema
// ==========================================
export const changePasswordSchema = z.object({
    body: z.object({
        oldPassword: simplePasswordSchema,
        newPassword: passwordSchema,
    }).refine(
        (data) => data.oldPassword !== data.newPassword,
        { message: 'New password must be different from old password', path: ['newPassword'] }
    ),
});

// ==========================================
// Refresh Token Schema
// ==========================================
export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
});

// ==========================================
// Update Profile Schema
// ==========================================
export const updateProfileSchema = z.object({
    body: z.object({
        name: nameSchema.optional(),
        phone: z.string()
            .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
            .optional(),
        avatar: z.string().url('Invalid avatar URL').optional(),
    }),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>['body'];
export type FacebookAuthInput = z.infer<typeof facebookAuthSchema>['body'];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];