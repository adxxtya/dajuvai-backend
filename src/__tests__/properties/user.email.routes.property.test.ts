/**
 * Property-Based Test for User Email Management Routes
 * Feature: migrate-missing-endpoints, Property 1: Route Endpoint Parity
 * Validates: Requirements 5.1-5.2
 * 
 * This test verifies that both email change endpoints from prod-backend
 * exist in the backend with identical route definitions.
 * 
 * NOTE: This is a static analysis test that reads the route file directly
 * to avoid database connection requirements.
 * 
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Property 1: Route Endpoint Parity - User Email Routes', () => {
    let routeFileContent: string;
    let userControllerContent: string;
    let validationFileContent: string;
    
    beforeAll(() => {
        // Read the user routes file
        const routeFilePath = join(__dirname, '../../routes/user.routes.ts');
        routeFileContent = readFileSync(routeFilePath, 'utf-8');
        
        // Read the user controller file
        const userControllerPath = join(__dirname, '../../controllers/user.controller.ts');
        userControllerContent = readFileSync(userControllerPath, 'utf-8');
        
        // Read the validation file
        const validationPath = join(__dirname, '../../utils/zod_validations/user.zod.ts');
        validationFileContent = readFileSync(validationPath, 'utf-8');
    });

    /**
     * Expected email change routes that should exist in backend
     * These are the 2 endpoints migrated from prod-backend
     */
    const expectedRoutes = [
        { 
            method: 'patch', 
            path: '/change-email', 
            description: 'Request email change', 
            requirement: '5.1',
            controller: 'userController.updateEmail'
        },
        { 
            method: 'post', 
            path: '/verify-email', 
            description: 'Verify email change', 
            requirement: '5.2',
            controller: 'userController.verifyEmailChange'
        },
    ];

    /**
     * Helper function to check if a route exists in the route file
     */
    function routeExistsInFile(method: string, path: string): boolean {
        // Escape special regex characters in the path
        const escapedPath = path.replace(/\//g, '\\/');
        
        // Create regex pattern to match userRouter.method('path', ...)
        const pattern = new RegExp(
            `userRouter\\.${method}\\s*\\(\\s*['"\`]${escapedPath}['"\`]`,
            'i'
        );
        
        return pattern.test(routeFileContent);
    }

    it('should have both email change endpoints from prod-backend', () => {
        const missingRoutes: string[] = [];
        
        expectedRoutes.forEach(route => {
            const exists = routeExistsInFile(route.method, route.path);
            
            if (!exists) {
                missingRoutes.push(
                    `${route.method.toUpperCase()} ${route.path} - ${route.description} (Requirement ${route.requirement})`
                );
            }
        });

        // Assert that no routes are missing
        expect(missingRoutes).toEqual([]);
        
        // If this fails, log which routes are missing
        if (missingRoutes.length > 0) {
            console.error('Missing routes:');
            missingRoutes.forEach(route => console.error(`  - ${route}`));
        }
    });

    it('should verify each endpoint individually for Requirements 5.1-5.2', () => {
        // Test each route individually for better error reporting
        expect(routeExistsInFile('patch', '/change-email')).toBe(true); // Requirement 5.1
        expect(routeExistsInFile('post', '/verify-email')).toBe(true); // Requirement 5.2
    });

    it('should have exactly 2 migrated email change endpoints', () => {
        const foundRoutes = expectedRoutes.filter(route => 
            routeExistsInFile(route.method, route.path)
        );
        
        expect(foundRoutes.length).toBe(2);
    });

    it('should verify updateEmail method exists in user controller', () => {
        expect(userControllerContent).toContain('async updateEmail');
        expect(userControllerContent).toContain('findUserByEmail');
        expect(userControllerContent).toContain('findVendorByEmail');
        expect(userControllerContent).toContain('sendVerificationEmail');
    });

    it('should verify verifyEmailChange method exists in user controller', () => {
        expect(userControllerContent).toContain('async verifyEmailChange');
        expect(userControllerContent).toContain('verificationCode');
        expect(userControllerContent).toContain('verificationCodeExpire');
    });

    it('should verify logger is used instead of console.log in user controller (Requirement 8.5)', () => {
        // Verify that logger is imported
        expect(userControllerContent).toContain("import logger from");
        
        // Verify that logger methods are used in email change methods
        const updateEmailMatch = userControllerContent.match(/async updateEmail[\s\S]*?}\s*async/);
        if (updateEmailMatch) {
            const updateEmailMethod = updateEmailMatch[0];
            // Should use logger.debug or logger.error
            expect(updateEmailMethod).toContain('logger.');
        }
    });

    it('should verify validation schemas exist (Requirement 6.4)', () => {
        // Verify changeEmailSchema exists
        expect(validationFileContent).toContain('export const changeEmailSchema');
        expect(validationFileContent).toContain('newEmail');
        
        // Verify verifyEmailChangeSchema exists
        expect(validationFileContent).toContain('export const verifyEmailChangeSchema');
        expect(validationFileContent).toContain('token');
        expect(validationFileContent).toContain('emailChangeToken');
    });

    it('should verify auth middleware is used for both routes (Requirements 5.1, 5.2)', () => {
        // Verify that authMiddleware is used for change-email route
        const changeEmailPattern = /userRouter\.patch\s*\(\s*['"]\/change-email['"]\s*,\s*authMiddleware/;
        expect(changeEmailPattern.test(routeFileContent)).toBe(true);
        
        // Verify that authMiddleware is used for verify-email route
        const verifyEmailPattern = /userRouter\.post\s*\(\s*['"]\/verify-email['"]\s*,\s*authMiddleware/;
        expect(verifyEmailPattern.test(routeFileContent)).toBe(true);
    });

    it('should verify validation middleware is used for both routes (Requirement 6.4)', () => {
        // Verify that validateZod(changeEmailSchema) is used for change-email route
        expect(routeFileContent).toContain('validateZod(changeEmailSchema)');
        
        // Verify that validateZod(verifyEmailChangeSchema) is used for verify-email route
        expect(routeFileContent).toContain('validateZod(verifyEmailChangeSchema)');
    });

    it('should verify Swagger documentation is preserved (Requirement 8.3)', () => {
        // Verify that Swagger comments exist for the routes
        expect(routeFileContent).toContain('@swagger');
        expect(routeFileContent).toContain('/api/auth/change-email');
        expect(routeFileContent).toContain('/api/auth/verify-email');
        expect(routeFileContent).toContain('Request email change');
        expect(routeFileContent).toContain('Verify email change');
    });

    it('should verify email change workflow is complete', () => {
        // Verify that the workflow includes:
        // 1. Email validation
        expect(validationFileContent).toContain('email(');
        
        // 2. Token generation and verification
        expect(userControllerContent).toContain('generateToken');
        expect(userControllerContent).toContain('hashToken');
        
        // 3. JWT for email change
        expect(userControllerContent).toContain('jwt.sign');
        expect(userControllerContent).toContain('jwt.verify');
        
        // 4. Email notification
        expect(userControllerContent).toContain('sendVerificationEmail');
        
        // 5. Token expiration handling
        expect(userControllerContent).toContain('verificationCodeExpire');
    });

    it('should verify error handling for email already in use (Requirement 9.1)', () => {
        // Verify that the controller checks for existing email
        expect(userControllerContent).toContain('Email already in use');
        expect(userControllerContent).toContain('findUserByEmail');
        expect(userControllerContent).toContain('findVendorByEmail');
    });

    it('should verify token expiration handling (Requirement 9.1)', () => {
        // Verify that the controller checks for token expiration
        expect(userControllerContent).toContain('Token expired');
        expect(userControllerContent).toContain('verificationCodeExpire');
    });

    it('should verify both user and vendor support', () => {
        // Verify that both user and vendor accounts can change email
        expect(userControllerContent).toContain('req.user');
        expect(userControllerContent).toContain('req.vendor');
        expect(userControllerContent).toContain('saveUser');
        expect(userControllerContent).toContain('saveVendor');
    });
});
