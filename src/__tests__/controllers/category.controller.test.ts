import { Request, Response } from 'express';
import { CategoryController } from '../../controllers/category.controller';
import { CategoryService } from '../../service/category.service';
import { APIError } from '../../utils/ApiError.utils';
import { Category } from '../../entities/category.entity';

// Mock the CategoryService
jest.mock('../../service/category.service');

// Mock logger
jest.mock('../../config/logger.config', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

// Skip database setup for unit tests
jest.mock('../../config/db.test.config', () => ({
    initializeTestDatabase: jest.fn(),
    closeTestDatabase: jest.fn(),
    clearTestDatabase: jest.fn(),
}));

describe('CategoryController - Search Categories', () => {
    let categoryController: CategoryController;
    let mockCategoryService: any;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
        // Create mock service
        mockCategoryService = {
            searchCategoryByName: jest.fn(),
        };
        
        categoryController = new CategoryController();
        (categoryController as any).categoryService = mockCategoryService;

        // Setup mock request and response
        mockRequest = {
            user: { id: 1, email: 'admin@test.com', role: 'ADMIN' },
            query: {},
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('searchCategories', () => {
        it('should search categories with valid query', async () => {
            const mockCategories = [
                {
                    id: 1,
                    name: 'Electronics',
                    image: 'https://example.com/electronics.jpg',
                } as Category,
                {
                    id: 2,
                    name: 'Electronic Accessories',
                    image: 'https://example.com/accessories.jpg',
                } as Category,
            ];

            mockRequest.query = { name: 'Electron' };
            mockCategoryService.searchCategoryByName.mockResolvedValue(mockCategories);

            await categoryController.searchCategories(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockCategoryService.searchCategoryByName).toHaveBeenCalledWith('Electron');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockCategories,
            });
        });

        it('should return 400 when search query is missing', async () => {
            mockRequest.query = {};

            await categoryController.searchCategories(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'search querry is required',
            });
        });

        it('should return 400 when search query is empty string', async () => {
            mockRequest.query = { name: '   ' };

            await categoryController.searchCategories(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'search querry is required',
            });
        });

        it('should return 401 when user is not authenticated', async () => {
            mockRequest.user = null;

            await categoryController.searchCategories(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Unauthorized',
            });
        });

        it('should return empty array when no categories match', async () => {
            mockRequest.query = { name: 'NonExistentCategory' };
            mockCategoryService.searchCategoryByName.mockResolvedValue([]);

            await categoryController.searchCategories(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockCategoryService.searchCategoryByName).toHaveBeenCalledWith('NonExistentCategory');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: [],
            });
        });

        it('should handle service errors', async () => {
            mockRequest.query = { name: 'Electronics' };
            const serviceError = new Error('Database connection failed');
            mockCategoryService.searchCategoryByName.mockRejectedValue(serviceError);

            await categoryController.searchCategories(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal server error',
            });
        });
    });
});
