import { Request, Response } from 'express';
import { ImageController } from '../../controllers/image.controller';
import { ImageService } from '../../service/image.service';
import { APIError } from '../../utils/ApiError.utils';

// Mock the ImageService
jest.mock('../../service/image.service');

// Mock logger - return the mock object directly for default export
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

describe('ImageController - Image Upload Endpoint', () => {
    let imageController: ImageController;
    let mockImageService: any;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
        // Create mock service
        mockImageService = {
            uploadSingleImage: jest.fn(),
        };
        
        imageController = new ImageController();
        (imageController as any).imageService = mockImageService;

        // Setup mock request and response
        mockRequest = {
            files: [],
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

    describe('uplaodSingle - with folder parameter', () => {
        it('should upload image with folder parameter', async () => {
            const mockFile = {
                fieldname: 'file',
                originalname: 'test.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                buffer: Buffer.from('test'),
                size: 1024,
            } as Express.Multer.File;

            const mockUrl = 'https://res.cloudinary.com/demo/image/upload/v1698854012/products/test.jpg';

            mockRequest.files = [mockFile];
            mockRequest.query = { folder: 'products' };
            mockImageService.uploadSingleImage.mockResolvedValue(mockUrl);

            await imageController.uplaodSingle(
                mockRequest as Request<{}, {}, {}, { folder: string }>,
                mockResponse as Response
            );

            expect(mockImageService.uploadSingleImage).toHaveBeenCalledWith(mockFile, 'products');
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockUrl,
            });
        });
    });

    describe('uplaodSingle - without folder parameter', () => {
        it('should upload image without folder parameter', async () => {
            const mockFile = {
                fieldname: 'file',
                originalname: 'test.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                buffer: Buffer.from('test'),
                size: 1024,
            } as Express.Multer.File;

            const mockUrl = 'https://res.cloudinary.com/demo/image/upload/v1698854012/test.jpg';

            mockRequest.files = [mockFile];
            mockRequest.query = {};
            mockImageService.uploadSingleImage.mockResolvedValue(mockUrl);

            await imageController.uplaodSingle(
                mockRequest as Request<{}, {}, {}, { folder: string }>,
                mockResponse as Response
            );

            expect(mockImageService.uploadSingleImage).toHaveBeenCalledWith(mockFile, undefined);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockUrl,
            });
        });
    });

    describe('uplaodSingle - error handling', () => {
        it('should return 400 when no file is uploaded', async () => {
            mockRequest.files = [];

            await imageController.uplaodSingle(
                mockRequest as Request<{}, {}, {}, { folder: string }>,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'No file uploaded',
            });
        });

        it('should return 400 when files array is null', async () => {
            mockRequest.files = null;

            await imageController.uplaodSingle(
                mockRequest as Request<{}, {}, {}, { folder: string }>,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'No file uploaded',
            });
        });

        it('should handle APIError from service', async () => {
            const mockFile = {
                fieldname: 'file',
                originalname: 'test.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                buffer: Buffer.from('test'),
                size: 1024,
            } as Express.Multer.File;

            mockRequest.files = [mockFile];
            mockRequest.query = { folder: 'products' };
            
            const apiError = new APIError(400, 'Invalid file type');
            mockImageService.uploadSingleImage.mockRejectedValue(apiError);

            await imageController.uplaodSingle(
                mockRequest as Request<{}, {}, {}, { folder: string }>,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                msg: 'Invalid file type',
            });
        });

        it('should handle generic errors from service', async () => {
            const mockFile = {
                fieldname: 'file',
                originalname: 'test.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                buffer: Buffer.from('test'),
                size: 1024,
            } as Express.Multer.File;

            mockRequest.files = [mockFile];
            mockRequest.query = { folder: 'products' };
            
            const genericError = new Error('Cloudinary upload failed');
            mockImageService.uploadSingleImage.mockRejectedValue(genericError);

            await imageController.uplaodSingle(
                mockRequest as Request<{}, {}, {}, { folder: string }>,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                msg: 'Error uploding image',
            });
        });

        it('should handle invalid file formats', async () => {
            const mockFile = {
                fieldname: 'file',
                originalname: 'test.exe',
                encoding: '7bit',
                mimetype: 'application/x-msdownload',
                buffer: Buffer.from('test'),
                size: 1024,
            } as Express.Multer.File;

            mockRequest.files = [mockFile];
            mockRequest.query = { folder: 'products' };
            
            const apiError = new APIError(400, 'Invalid file format');
            mockImageService.uploadSingleImage.mockRejectedValue(apiError);

            await imageController.uplaodSingle(
                mockRequest as Request<{}, {}, {}, { folder: string }>,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                msg: 'Invalid file format',
            });
        });
    });
});
