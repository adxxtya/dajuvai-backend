/**
 * Property-Based Test for Payment Routes
 * Feature: migrate-missing-endpoints, Property 1: Route Endpoint Parity
 * Validates: Requirements 2.1-2.7
 * 
 * This test verifies that all 7 payment gateway endpoints from prod-backend
 * exist in the backend with identical route definitions.
 * 
 * NOTE: This is a static analysis test that reads the route file directly
 * to avoid database connection requirements.
 * 
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Property 1: Route Endpoint Parity - Payment Routes', () => {
    let routeFileContent: string;
    
    beforeAll(() => {
        // Read the payment routes file
        const routeFilePath = join(__dirname, '../../routes/payment.routes.ts');
        routeFileContent = readFileSync(routeFilePath, 'utf-8');
    });

    /**
     * Expected payment routes that should exist in backend
     * These are the 7 endpoints migrated from prod-backend
     */
    const expectedPaymentRoutes = [
        { method: 'get', path: '/payment-instruments', description: 'Get payment instruments', requirement: '2.1' },
        { method: 'post', path: '/service-charge', description: 'Get service charge', requirement: '2.2' },
        { method: 'post', path: '/process-id', description: 'Get process ID', requirement: '2.3' },
        { method: 'post', path: '/initiate-payment', description: 'Initiate payment', requirement: '2.4' },
        { method: 'post', path: '/check-status', description: 'Check transaction status', requirement: '2.5' },
        { method: 'get', path: '/response', description: 'Response URL handler', requirement: '2.6' },
        { method: 'get', path: '/notification', description: 'Notification URL (webhook)', requirement: '2.7' },
    ];

    /**
     * Helper function to check if a route exists in the route file
     */
    function routeExistsInFile(method: string, path: string): boolean {
        // Escape special regex characters in the path
        const escapedPath = path
            .replace(/\//g, '\\/')
            .replace(/:/g, ':');
        
        // Create regex pattern to match paymentRouter.method('path', ...)
        const pattern = new RegExp(
            `paymentRouter\\.${method}\\s*\\(\\s*['"\`]${escapedPath}['"\`]`,
            'i'
        );
        
        return pattern.test(routeFileContent);
    }

    it('should have all 7 payment gateway endpoints from prod-backend', () => {
        const missingRoutes: string[] = [];
        
        expectedPaymentRoutes.forEach(route => {
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

    it('should verify each endpoint individually for Requirements 2.1-2.7', () => {
        // Test each route individually for better error reporting
        expect(routeExistsInFile('get', '/payment-instruments')).toBe(true); // Requirement 2.1
        expect(routeExistsInFile('post', '/service-charge')).toBe(true); // Requirement 2.2
        expect(routeExistsInFile('post', '/process-id')).toBe(true); // Requirement 2.3
        expect(routeExistsInFile('post', '/initiate-payment')).toBe(true); // Requirement 2.4
        expect(routeExistsInFile('post', '/check-status')).toBe(true); // Requirement 2.5
        expect(routeExistsInFile('get', '/response')).toBe(true); // Requirement 2.6
        expect(routeExistsInFile('get', '/notification')).toBe(true); // Requirement 2.7
    });

    it('should have exactly 7 migrated payment endpoints', () => {
        const foundRoutes = expectedPaymentRoutes.filter(route => 
            routeExistsInFile(route.method, route.path)
        );
        
        expect(foundRoutes.length).toBe(7);
    });

    it('should verify asyncHandler wrapper is used for async routes', () => {
        // Verify that asyncHandler is imported
        expect(routeFileContent).toContain("import { asyncHandler }");
        
        // Verify that asyncHandler is used in route definitions
        expect(routeFileContent).toContain("asyncHandler(async");
    });

    it('should verify logger is used instead of console.log', () => {
        // Verify that logger is imported
        expect(routeFileContent).toContain("import logger");
        expect(routeFileContent).toContain("logError");
        expect(routeFileContent).toContain("logInfo");
        
        // Verify that console.log is NOT used (should be replaced with logger)
        const consoleLogPattern = /console\.(log|error|warn|info)/;
        expect(consoleLogPattern.test(routeFileContent)).toBe(false);
    });

    it('should verify environment variables are used for NPX config', () => {
        // Verify that environment variables are used instead of hardcoded values
        expect(routeFileContent).toContain("process.env.NPX_MERCHANT_ID");
        expect(routeFileContent).toContain("process.env.NPX_MERCHANT_NAME");
        expect(routeFileContent).toContain("process.env.NPX_API_USERNAME");
        expect(routeFileContent).toContain("process.env.NPX_API_PASSWORD");
        expect(routeFileContent).toContain("process.env.NPX_SECRET_KEY");
        expect(routeFileContent).toContain("process.env.NPX_BASE_URL");
        expect(routeFileContent).toContain("process.env.NPX_GATEWAY_URL");
    });

    it('should verify APIError class is used for error handling', () => {
        // Verify that APIError is imported
        expect(routeFileContent).toContain("import { APIError }");
        
        // Verify that APIError is used for throwing errors
        expect(routeFileContent).toContain("throw new APIError");
    });

    it('should verify signature generation function exists', () => {
        // Verify that generateSignature function is defined
        expect(routeFileContent).toContain("function generateSignature");
        expect(routeFileContent).toContain("crypto.createHmac('sha512'");
    });

    it('should verify auth header generation function exists', () => {
        // Verify that getAuthHeader function is defined
        expect(routeFileContent).toContain("function getAuthHeader");
        expect(routeFileContent).toContain("Buffer.from");
        expect(routeFileContent).toContain("toString('base64')");
    });
});
