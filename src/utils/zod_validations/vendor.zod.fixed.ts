import { z } from 'zod';

/**
 * Schema for vendor signup input validation.
 * Accepts both nested bankDetails object and flattened bank fields for backward compatibility.
 */
export const vendorSignupSchema = z.object({
    businessName: z.string().min(3, 'Business name must be at least 3 characters').max(100),
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(25),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
    telePhone: z.string().optional(),
    district: z.string().min(1, 'District is required'),
    
    businessRegNumber: z.string().min(1, 'Business registration number is required'),
    taxNumber: z.string().optional(),
    taxDocuments: z.array(z.string().url('Invalid tax document URL')).min(1, 'At least one tax document is required'),
    citizenshipDocuments: z.array(z.string().url('Invalid citizenship document URL')).optional(),
    chequePhoto: z.string().url('Invalid cheque photo URL').min(1, 'Cheque photo is required'),

    // Accept flattened bank details (from mobile app)
    accountName: z.string().min(1, 'Account name is required').optional(),
    bankName: z.string().min(1, 'Bank name is required').optional(),
    accountNumber: z.string().min(1, 'Account number is required').optional(),
    bankBranch: z.string().min(1, 'Bank branch is required').optional(),
    bankCode: z.string().optional(),
    
    // OR accept nested bankDetails object (for backward compatibility)
    bankDetails: z.object({
        accountName: z.string().min(1, 'Account name is required'),
        bankName: z.string().min(1, 'Bank name is required'),
        accountNumber: z.string().min(1, 'Account number is required'),
        bankBranch: z.string().min(1, 'Bank branch is required'),
        bankCode: z.string().optional(),
    }).optional(),
}).refine(
    (data) => {
        // Ensure either flattened fields OR nested bankDetails is provided
        const hasFlattened = data.accountName && data.bankName && data.accountNumber && data.bankBranch;
        const hasNested = data.bankDetails;
        return hasFlattened || hasNested;
    },
    {
        message: 'Bank details are required (either as individual fields or bankDetails object)',
        path: ['bankDetails'],
    }
);


/**
 * Schema for vendor login input validation.
 * Validates email format and password length.
 */
export const vendorLoginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters long')
        .max(25, 'Password must not exceed 25 characters'),
});

/**
 * Schema to request verification token for vendor email.
 */
export const verificationTokenSchema = z.object({
    email: z.string().email('Invalid email format'),
});

/**
 * Schema to verify vendor token.
 * Token must be exactly 6 digits long.
 */
export const verifyTokenSchema = z.object({
    email: z.string().email('Invalid email format'),
    token: z.string().length(6, 'Token must be 6 digits'),
});

/**
 * Schema to reset vendor password.
 * Validates newPass, confirmPass, and token.
 * Ensures passwords match.
 */
export const resetPasswordSchema = z.object({
    newPass: z.string()
        .min(8, 'Password must be at least 8 characters long')
        .max(100, 'Password must not exceed 100 characters'),
    confirmPass: z.string()
        .min(8, 'Password must be at least 8 characters long')
        .max(100, 'Password must not exceed 100 characters'),
    token: z.string().length(6, 'Token must be 6 digits'),
}).refine((data) => data.newPass === data.confirmPass, {
    message: 'Passwords must match',
    path: ['confirmPass'],
});


/**
 * Schema to update vendor info.
 * Fields optional except for id which must be a positive integer.
 */
export const updateVendorSchema = z.object({
    id: z.number().int().positive('ID must be a positive integer'),
    businessName: z.string()
        .min(3, 'Business name must be at least 3 characters long')
        .max(100, 'Business name must not exceed 100 characters')
        .optional(),
    email: z.string().email('Invalid email format').optional(),
    businessAddress: z.string()
        .min(10, 'Business address must be at least 10 characters long')
        .max(500, 'Business address must not exceed 500 characters')
        .optional(),
    phoneNumber: z.string()
        .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
        .optional(),
});
