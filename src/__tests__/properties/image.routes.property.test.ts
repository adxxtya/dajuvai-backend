/**
 * Property-Based Test for Image Routes
 * Feature: migrate-missing-endpoints, Property 1: Route Endpoint Parity
 * Validates: Requirements 3.1
 * 
 * This test verifies that the image upload endpoint from prod-backend
 * exists in the backend with identical route definition.
 * 
 * NOTE: This is a static analysis test that reads the route file directly
 * to avoid database connection requirements.
 * 
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Property 1: Route Endpoint Parity - Image Routes', () => {
    let routeFileContent: string;
    let controllerFileContent: string;
    
    beforeAll(() => {
        // Read the image routes file
        const routeFilePath = join(__dirname, '../../routes/image.routes.ts');
        routeFileContent = readFileSync(routeFilePath, 'utf-8');
        
        // Read the image controller file
        const controllerFilePath = join(__dirname, '../../controllers/image.controller.ts');
        controllerFileContent = readFileSync(controllerFilePath, 'utf-8');
    });

    /**
     * Expected image route that should exist in backend
     * This is the 1 endpoint migrated from prod-backend
     */
    const expectedImageRoute = {
        method: 'post',
        path: '/',
        description: 'Upload single image to Cloudinary',
        requirement: '3.1'
    };

    /**
     * Helper function to check if a route exists in the route file
     */
    function routeExistsInFile(method: string, path: string): boolean {
        // Escape special regex characters in the path
        const escapedPath = path
            .replace(/\//g, '\\/')
            .replace(/:/g, ':');
        
        // Create regex pattern to match imageRouter.method('path', ...)
        const pattern = new RegExp(
            `imageRouter\\.${method}\\s*\\(\\s*['"\`]${escapedPath}['"\`]`,
            'i'
        );
        
        return pattern.test(routeFileContent);
    }

    it('should have the image upload endpoint from prod-backend (Requirement 3.1)', () => {
        const exists = routeExistsInFile(expectedImageRoute.method, expectedImageRoute.path);
        
        expect(exists).toBe(true);
        
        if (!exists) {
            console.error(
                `Missing route: ${expectedImageRoute.method.toUpperCase()} ${expectedImageRoute.path} - ${expectedImageRoute.description} (Requirement ${expectedImageRoute.requirement})`
            );
        }
    });

    it('should verify uploadMiddleware is used in the route', () => {
        // Verify that uploadMiddleware is imported
        expect(routeFileContent).toContain("import { uploadMiddleware }");
        
        // Verify that uploadMiddleware is used in the route definition
        expect(routeFileContent).toContain("uploadMiddleware");
    });

    it('should verify imageController.uplaodSingle is bound to the route', () => {
        // Verify that ImageController is imported
        expect(routeFileContent).toContain("import { ImageController }");
        
        // Verify that imageController is instantiated
        expect(routeFileContent).toContain("new ImageController()");
        
        // Verify that uplaodSingle method is bound to the route
        expect(routeFileContent).toContain("imageController.uplaodSingle.bind(imageController)");
    });

    it('should verify folder parameter is supported in controller (Requirement 3.2)', () => {
        // Verify that folder parameter is extracted from query
        expect(controllerFileContent).toContain("req.query.folder");
        
        // Verify that folder is passed to uploadSingleImage
        expect(controllerFileContent).toContain("uploadSingleImage(file, folder)");
    });

    it('should verify logger is used instead of console.log (Requirement 8.5)', () => {
        // Verify that logger is imported in controller
        expect(controllerFileContent).toContain("import logger from");
        
        // Verify that logger methods are used
        expect(controllerFileContent).toContain("logger.debug");
        expect(controllerFileContent).toContain("logger.info");
        expect(controllerFileContent).toContain("logger.error");
        
        // Verify that console.log is NOT used (should be replaced with logger)
        const consoleLogPattern = /console\.(log|error|warn|info)/;
        expect(consoleLogPattern.test(controllerFileContent)).toBe(false);
    });

    it('should verify APIError class is used for error handling (Requirement 6.1)', () => {
        // Verify that APIError is imported in controller
        expect(controllerFileContent).toContain("import { APIError }");
        
        // Verify that APIError is used in error handling
        expect(controllerFileContent).toContain("error instanceof APIError");
    });

    it('should verify ImageService is used in controller', () => {
        // Verify that ImageService is imported
        expect(controllerFileContent).toContain("import { ImageService }");
        
        // Verify that ImageService is instantiated
        expect(controllerFileContent).toContain("new ImageService()");
        
        // Verify that uploadSingleImage method is called
        expect(controllerFileContent).toContain("this.imageService.uploadSingleImage");
    });

    it('should verify Swagger documentation is preserved (Requirement 8.3)', () => {
        // Verify that Swagger comments exist
        expect(routeFileContent).toContain("@swagger");
        expect(routeFileContent).toContain("/api/image");
        expect(routeFileContent).toContain("Upload a single image to Cloudinary");
        
        // Verify folder parameter is documented
        expect(routeFileContent).toContain("folder");
        expect(routeFileContent).toContain("The folder in Cloudinary");
        
        // Verify multipart/form-data is documented
        expect(routeFileContent).toContain("multipart/form-data");
    });

    it('should verify error handling for no file uploaded', () => {
        // Verify that the controller checks for missing files
        expect(controllerFileContent).toContain("!files || files.length === 0");
        expect(controllerFileContent).toContain("No file uploaded");
    });

    it('should verify successful response format', () => {
        // Verify that success response includes success flag and data
        expect(controllerFileContent).toContain("success: true");
        expect(controllerFileContent).toContain("data: upload");
    });

    it('should verify error response format', () => {
        // Verify that error response includes success flag and message
        expect(controllerFileContent).toContain("success: false");
        expect(controllerFileContent).toContain("msg:");
    });
});
