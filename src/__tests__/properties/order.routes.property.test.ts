/**
 * Property-Based Test for Order Routes
 * Feature: migrate-missing-endpoints, Property 1: Route Endpoint Parity
 * Validates: Requirements 1.1-1.13
 * 
 * This test verifies that all 13 order management endpoints from prod-backend
 * exist in the backend with identical route definitions.
 * 
 * NOTE: This is a static analysis test that reads the route file directly
 * to avoid database connection requirements.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Skip database setup for this test
jest.mock('../../config/db.test.config', () => ({
    initializeTestDatabase: jest.fn(),
    closeTestDatabase: jest.fn(),
    clearTestDatabase: jest.fn(),
}));

describe('Property 1: Route Endpoint Parity - Order Routes', () => {
    let routeFileContent: string;
    
    beforeAll(() => {
        // Read the order routes file
        const routeFilePath = join(__dirname, '../../routes/order.routes.ts');
        routeFileContent = readFileSync(routeFilePath, 'utf-8');
    });

    /**
     * Expected order routes that should exist in backend
     * These are the 13 endpoints migrated from prod-backend
     */
    const expectedOrderRoutes = [
        { method: 'get', path: '/customer/order/:id', description: 'Get order by ID for customer', requirement: '1.1' },
        { method: 'get', path: '/admin/:orderId', description: 'Get order details for admin', requirement: '1.2' },
        { method: 'put', path: '/admin/:orderId/status', description: 'Update order status (admin)', requirement: '1.3' },
        { method: 'get', path: '/admin/order/search', description: 'Search orders by ID', requirement: '1.4' },
        { method: 'get', path: '/user/track', description: 'Track order by ID', requirement: '1.5' },
        { method: 'get', path: '/vendor/orders', description: 'Get all orders for vendor', requirement: '1.6' },
        { method: 'get', path: '/vendor/:orderId', description: 'Get specific order for vendor', requirement: '1.7' },
        { method: 'get', path: '/customer/history', description: 'Get customer order history', requirement: '1.8' },
        { method: 'post', path: '/search/merchant-transactionId', description: 'Search by merchant transaction ID', requirement: '1.9' },
        { method: 'delete', path: '/order/delete/all', description: 'Bulk delete orders', requirement: '1.10' },
        { method: 'post', path: '/esewa/success', description: 'Handle eSewa success callback', requirement: '1.11' },
        { method: 'post', path: '/esewa/fail', description: 'Handle eSewa failure callback', requirement: '1.12' },
        { method: 'post', path: '/check-promo', description: 'Validate promo code', requirement: '1.13' },
    ];

    /**
     * Helper function to check if a route exists in the route file
     */
    function routeExistsInFile(method: string, path: string): boolean {
        // Escape special regex characters in the path
        const escapedPath = path
            .replace(/\//g, '\\/')
            .replace(/:/g, ':');
        
        // Create regex pattern to match router.method('path', ...)
        const pattern = new RegExp(
            `router\\.${method}\\s*\\(\\s*['"\`]${escapedPath}['"\`]`,
            'i'
        );
        
        return pattern.test(routeFileContent);
    }

    it('should have all 13 order management endpoints from prod-backend', () => {
        const missingRoutes: string[] = [];
        
        expectedOrderRoutes.forEach(route => {
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

    it('should verify each endpoint individually for Requirements 1.1-1.13', () => {
        // Test each route individually for better error reporting
        expect(routeExistsInFile('get', '/customer/order/:id')).toBe(true); // Requirement 1.1
        expect(routeExistsInFile('get', '/admin/:orderId')).toBe(true); // Requirement 1.2
        expect(routeExistsInFile('put', '/admin/:orderId/status')).toBe(true); // Requirement 1.3
        expect(routeExistsInFile('get', '/admin/order/search')).toBe(true); // Requirement 1.4
        expect(routeExistsInFile('get', '/user/track')).toBe(true); // Requirement 1.5
        expect(routeExistsInFile('get', '/vendor/orders')).toBe(true); // Requirement 1.6
        expect(routeExistsInFile('get', '/vendor/:orderId')).toBe(true); // Requirement 1.7
        expect(routeExistsInFile('get', '/customer/history')).toBe(true); // Requirement 1.8
        expect(routeExistsInFile('post', '/search/merchant-transactionId')).toBe(true); // Requirement 1.9
        expect(routeExistsInFile('delete', '/order/delete/all')).toBe(true); // Requirement 1.10
        expect(routeExistsInFile('post', '/esewa/success')).toBe(true); // Requirement 1.11
        expect(routeExistsInFile('post', '/esewa/fail')).toBe(true); // Requirement 1.12
        expect(routeExistsInFile('post', '/check-promo')).toBe(true); // Requirement 1.13
    });

    it('should have exactly 13 migrated order endpoints', () => {
        const foundRoutes = expectedOrderRoutes.filter(route => 
            routeExistsInFile(route.method, route.path)
        );
        
        expect(foundRoutes.length).toBe(13);
    });

    it('should verify controller method bindings exist for all routes', () => {
        // Verify that controller methods are properly bound
        const controllerMethods = [
            'getOrderById',
            'getOrderDetails',
            'updateOrderStatus',
            'searchOrdersById',
            'trackOrderById',
            'getVendorOrders',
            'getVendorOrderDetails',
            'getCustomerOrderHistory',
            'getOrderDetailByMerchantTransactionId',
            'deleteOrder',
            'esewaPaymentSuccess',
            'esewaPaymentFailed',
            'checkAvailablePromocode',
        ];

        controllerMethods.forEach(method => {
            expect(routeFileContent).toContain(`orderController.${method}`);
        });
    });
});
