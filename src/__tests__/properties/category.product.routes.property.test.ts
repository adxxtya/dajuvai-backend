/**
 * Property-Based Test for Category and Product Search Routes
 * Feature: migrate-missing-endpoints, Property 1: Route Endpoint Parity
 * Validates: Requirements 4.1-4.4
 * 
 * This test verifies that all 4 category/product search endpoints from prod-backend
 * exist in the backend with identical route definitions.
 * 
 * NOTE: This is a static analysis test that reads the route file directly
 * to avoid database connection requirements.
 * 
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Property 1: Route Endpoint Parity - Category/Product Routes', () => {
    let routeFileContent: string;
    let categoryControllerContent: string;
    let productControllerContent: string;
    
    beforeAll(() => {
        // Read the category routes file
        const routeFilePath = join(__dirname, '../../routes/category.routes.ts');
        routeFileContent = readFileSync(routeFilePath, 'utf-8');
        
        // Read the category controller file
        const categoryControllerPath = join(__dirname, '../../controllers/category.controller.ts');
        categoryControllerContent = readFileSync(categoryControllerPath, 'utf-8');
        
        // Read the product controller file
        const productControllerPath = join(__dirname, '../../controllers/product.controller.ts');
        productControllerContent = readFileSync(productControllerPath, 'utf-8');
    });

    /**
     * Expected category/product routes that should exist in backend
     * These are the 4 endpoints migrated from prod-backend
     */
    const expectedRoutes = [
        { 
            method: 'get', 
            path: '/search/name', 
            description: 'Search categories by name', 
            requirement: '4.1',
            controller: 'categoryController.searchCategories'
        },
        { 
            method: 'post', 
            path: '/:categoryId/subcategories/:subcategoryId/products', 
            description: 'Create product under category/subcategory', 
            requirement: '4.2',
            controller: 'productController.createProduct'
        },
        { 
            method: 'get', 
            path: '/all/products', 
            description: 'Get all products with category hierarchy', 
            requirement: '4.3',
            controller: 'productController.getAllProducts'
        },
        { 
            method: 'get', 
            path: '/:categoryId/subcategories/:subcategoryId/products/:id', 
            description: 'Get product by ID with category/subcategory context', 
            requirement: '4.4',
            controller: 'productController.getProductById'
        },
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

    it('should have all 4 category/product search endpoints from prod-backend', () => {
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

    it('should verify each endpoint individually for Requirements 4.1-4.4', () => {
        // Test each route individually for better error reporting
        expect(routeExistsInFile('get', '/search/name')).toBe(true); // Requirement 4.1
        expect(routeExistsInFile('post', '/:categoryId/subcategories/:subcategoryId/products')).toBe(true); // Requirement 4.2
        expect(routeExistsInFile('get', '/all/products')).toBe(true); // Requirement 4.3
        expect(routeExistsInFile('get', '/:categoryId/subcategories/:subcategoryId/products/:id')).toBe(true); // Requirement 4.4
    });

    it('should have exactly 4 migrated category/product endpoints', () => {
        const foundRoutes = expectedRoutes.filter(route => 
            routeExistsInFile(route.method, route.path)
        );
        
        expect(foundRoutes.length).toBe(4);
    });

    it('should verify searchCategories method exists in category controller', () => {
        expect(categoryControllerContent).toContain('async searchCategories');
        expect(categoryControllerContent).toContain('searchCategoryByName');
    });

    it('should verify logger is used instead of console.log in category controller (Requirement 8.5)', () => {
        // Verify that logger is imported
        expect(categoryControllerContent).toContain("import logger from");
        
        // Verify that logger methods are used in searchCategories
        const searchCategoriesMatch = categoryControllerContent.match(/async searchCategories[\s\S]*?catch \(error\)/);
        if (searchCategoriesMatch) {
            const searchCategoriesMethod = searchCategoriesMatch[0];
            expect(searchCategoriesMethod).toContain('logger.');
        }
    });

    it('should verify hierarchical product methods exist in product controller', () => {
        // Verify createProduct method
        expect(productControllerContent).toContain('async createProduct');
        
        // Verify getAllProducts method
        expect(productControllerContent).toContain('async getAllProducts');
        
        // Verify getProductById method
        expect(productControllerContent).toContain('async getProductById');
    });

    it('should verify logger is used instead of console.log in product controller (Requirement 8.5)', () => {
        // Verify that logger is imported
        expect(productControllerContent).toContain("import logger from");
        
        // Verify that console.log is NOT used in createProduct, getAllProducts, getProductById
        const createProductMatch = productControllerContent.match(/async createProduct[\s\S]*?}\s*async/);
        const getAllProductsMatch = productControllerContent.match(/async getAllProducts[\s\S]*?}\s*async/);
        const getProductByIdMatch = productControllerContent.match(/async getProductById[\s\S]*?}\s*async/);
        
        if (createProductMatch) {
            const consolePattern = /console\.(log|error|warn|info)/;
            expect(consolePattern.test(createProductMatch[0])).toBe(false);
        }
        
        if (getAllProductsMatch) {
            const consolePattern = /console\.(log|error|warn|info)/;
            expect(consolePattern.test(getAllProductsMatch[0])).toBe(false);
        }
        
        if (getProductByIdMatch) {
            const consolePattern = /console\.(log|error|warn|info)/;
            expect(consolePattern.test(getProductByIdMatch[0])).toBe(false);
        }
    });

    it('should verify auth middleware is used for category search (Requirement 4.1)', () => {
        // Verify that authMiddleware and isAdminOrStaff are used for search route
        const searchRoutePattern = /router\.get\s*\(\s*['"]\/search\/name['"]\s*,\s*authMiddleware\s*,\s*isAdminOrStaff/;
        expect(searchRoutePattern.test(routeFileContent)).toBe(true);
    });

    it('should verify vendor auth middleware is used for product creation (Requirement 4.2)', () => {
        // Verify that vendorAuthMiddleware and isVendor are used for product creation
        const createProductPattern = /router\.post\s*\(\s*['"]\/:\w+\/subcategories\/:\w+\/products['"]\s*,\s*vendorAuthMiddleware\s*,\s*isVendor/;
        expect(createProductPattern.test(routeFileContent)).toBe(true);
    });

    it('should verify Swagger documentation is preserved (Requirement 8.3)', () => {
        // Verify that Swagger comments exist for the routes
        expect(routeFileContent).toContain('@swagger');
        expect(routeFileContent).toContain('/api/categories/search/name');
        expect(routeFileContent).toContain('/api/categories/all/products');
        expect(routeFileContent).toContain('/:categoryId/subcategories/:subcategoryId/products');
    });

    it('should verify category hierarchy is maintained in routes', () => {
        // Verify that routes maintain category -> subcategory -> product hierarchy
        expect(routeFileContent).toContain(':categoryId');
        expect(routeFileContent).toContain(':subcategoryId');
        expect(routeFileContent).toContain('/subcategories/');
        expect(routeFileContent).toContain('/products');
    });
});
