import { Response } from 'express';
import { UserController } from '../../controllers/user.controller';
import * as userService from '../../service/user.service';
import * as nodemailerUtils from '../../utils/nodemailer.utils';
import { APIError } from '../../utils/ApiError.utils';
import { User } from '../../entities/user.entity';
import { Vendor } from '../../entities/vendor.entity';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('../../service/user.service');
jest.mock('../../utils/nodemailer.utils');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

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

describe('UserController - Email Change Endpoints', () => {
    let userController: UserController;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
        userController = new UserController();
        
        // Setup mock request and response
        mockRequest = {
            user: null,
            vendor: null,
            body: {},
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('updateEmail - Request email change', () => {
        it('should send verification email with valid request', async () => {
            const mockUser = {
                id: 1,
                email: 'old@test.com',
                verificationCode: null,
                verificationCodeExpire: null,
            } as User;

            mockRequest.user = mockUser;
            mockRequest.body = { newEmail: 'new@test.com' };

            (userService.findUserByEmail as jest.Mock).mockResolvedValue(null);
            (userService.findVendorByEmail as jest.Mock).mockResolvedValue(null);
            (userService.saveUser as jest.Mock).mockResolvedValue(mockUser);
            (nodemailerUtils.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);
            (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');

            await userController.updateEmail(
                mockRequest as any,
                mockResponse as Response
            );

            expect(userService.findUserByEmail).toHaveBeenCalledWith('new@test.com');
            expect(nodemailerUtils.sendVerificationEmail).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(202);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Verification email sent to new email address.',
                    emailChangeToken: 'mock-jwt-token',
                })
            );
        });

        it('should return 400 when newEmail is missing', async () => {
            mockRequest.user = { id: 1 } as User;
            mockRequest.body = {};

            await userController.updateEmail(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errors: expect.any(Array),
                })
            );
        });

        it('should return 400 when newEmail is invalid format', async () => {
            mockRequest.user = { id: 1 } as User;
            mockRequest.body = { newEmail: 'invalid-email' };

            await userController.updateEmail(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errors: expect.any(Array),
                })
            );
        });

        it('should return 401 when user is not authenticated', async () => {
            mockRequest.user = null;
            mockRequest.vendor = null;
            mockRequest.body = { newEmail: 'new@test.com' };

            await userController.updateEmail(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Unauthorized. Please log in.',
            });
        });

        it('should return 409 when email already in use by user', async () => {
            mockRequest.user = { id: 1 } as User;
            mockRequest.body = { newEmail: 'existing@test.com' };

            (userService.findUserByEmail as jest.Mock).mockResolvedValue({ id: 2 } as User);
            (userService.findVendorByEmail as jest.Mock).mockResolvedValue(null);

            await userController.updateEmail(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(409);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email already in use.',
            });
        });

        it('should return 409 when email already in use by vendor', async () => {
            mockRequest.user = { id: 1 } as User;
            mockRequest.body = { newEmail: 'existing@test.com' };

            (userService.findUserByEmail as jest.Mock).mockResolvedValue(null);
            (userService.findVendorByEmail as jest.Mock).mockResolvedValue({ id: 2 } as Vendor);

            await userController.updateEmail(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(409);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email already in use.',
            });
        });

        it('should work for vendor accounts', async () => {
            const mockVendor = {
                id: 1,
                email: 'vendor@test.com',
                verificationCode: null,
                verificationCodeExpire: null,
            } as Vendor;

            mockRequest.vendor = mockVendor;
            mockRequest.body = { newEmail: 'newvendor@test.com' };

            (userService.findUserByEmail as jest.Mock).mockResolvedValue(null);
            (userService.findVendorByEmail as jest.Mock).mockResolvedValue(null);
            (userService.saveVendor as jest.Mock).mockResolvedValue(mockVendor);
            (nodemailerUtils.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);
            (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');

            await userController.updateEmail(
                mockRequest as any,
                mockResponse as Response
            );

            expect(userService.saveVendor).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(202);
        });
    });

    describe('verifyEmailChange - Verify email change', () => {
        it('should update email with valid token', async () => {
            const mockUser = {
                id: 1,
                email: 'old@test.com',
                verificationCode: 'hashed-token',
                verificationCodeExpire: new Date(Date.now() + 10 * 60 * 1000),
            } as User;

            mockRequest.user = mockUser;
            mockRequest.body = {
                token: '123456',
                emailChangeToken: 'valid-jwt-token',
            };

            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.verify as jest.Mock).mockReturnValue({
                id: 1,
                newEmail: 'new@test.com',
                type: 'user',
            });
            (userService.findUserByEmail as jest.Mock).mockResolvedValue(null);
            (userService.findVendorByEmail as jest.Mock).mockResolvedValue(null);
            (userService.saveUser as jest.Mock).mockResolvedValue(mockUser);

            await userController.verifyEmailChange(
                mockRequest as any,
                mockResponse as Response
            );

            expect(bcrypt.compare).toHaveBeenCalledWith('123456', 'hashed-token');
            expect(jwt.verify).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Email updated successfully.',
            });
        });

        it('should return 400 when token is missing', async () => {
            mockRequest.user = { id: 1 } as User;
            mockRequest.body = { emailChangeToken: 'jwt-token' };

            await userController.verifyEmailChange(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errors: expect.any(Array),
                })
            );
        });

        it('should return 400 when emailChangeToken is missing', async () => {
            mockRequest.user = { id: 1 } as User;
            mockRequest.body = { token: '123456' };

            await userController.verifyEmailChange(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errors: expect.any(Array),
                })
            );
        });

        it('should return 401 when user is not authenticated', async () => {
            mockRequest.user = null;
            mockRequest.vendor = null;
            mockRequest.body = {
                token: '123456',
                emailChangeToken: 'jwt-token',
            };

            await userController.verifyEmailChange(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Unauthorized. Please log in.',
            });
        });

        it('should return 410 when no email change request found', async () => {
            const mockUser = {
                id: 1,
                email: 'old@test.com',
                verificationCode: null,
                verificationCodeExpire: null,
            } as User;

            mockRequest.user = mockUser;
            mockRequest.body = {
                token: '123456',
                emailChangeToken: 'jwt-token',
            };

            await userController.verifyEmailChange(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(410);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'No email change request found.',
            });
        });

        it('should return 410 when token expired', async () => {
            const mockUser = {
                id: 1,
                email: 'old@test.com',
                verificationCode: 'hashed-token',
                verificationCodeExpire: new Date(Date.now() - 10 * 60 * 1000), // Expired
            } as User;

            mockRequest.user = mockUser;
            mockRequest.body = {
                token: '123456',
                emailChangeToken: 'jwt-token',
            };

            await userController.verifyEmailChange(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(410);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Token expired.',
            });
        });

        it('should return 400 when verification token is invalid', async () => {
            const mockUser = {
                id: 1,
                email: 'old@test.com',
                verificationCode: 'hashed-token',
                verificationCodeExpire: new Date(Date.now() + 10 * 60 * 1000),
            } as User;

            mockRequest.user = mockUser;
            mockRequest.body = {
                token: 'wrong-token',
                emailChangeToken: 'jwt-token',
            };

            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await userController.verifyEmailChange(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid token.',
            });
        });

        it('should return 400 when JWT is invalid', async () => {
            const mockUser = {
                id: 1,
                email: 'old@test.com',
                verificationCode: 'hashed-token',
                verificationCodeExpire: new Date(Date.now() + 10 * 60 * 1000),
            } as User;

            mockRequest.user = mockUser;
            mockRequest.body = {
                token: '123456',
                emailChangeToken: 'invalid-jwt',
            };

            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await userController.verifyEmailChange(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid or expired email change token.',
            });
        });

        it('should return 400 when user ID mismatch', async () => {
            const mockUser = {
                id: 1,
                email: 'old@test.com',
                verificationCode: 'hashed-token',
                verificationCodeExpire: new Date(Date.now() + 10 * 60 * 1000),
            } as User;

            mockRequest.user = mockUser;
            mockRequest.body = {
                token: '123456',
                emailChangeToken: 'jwt-token',
            };

            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.verify as jest.Mock).mockReturnValue({
                id: 999, // Different ID
                newEmail: 'new@test.com',
                type: 'user',
            });

            await userController.verifyEmailChange(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid token: User or type mismatch.',
            });
        });

        it('should return 409 when new email already in use', async () => {
            const mockUser = {
                id: 1,
                email: 'old@test.com',
                verificationCode: 'hashed-token',
                verificationCodeExpire: new Date(Date.now() + 10 * 60 * 1000),
            } as User;

            mockRequest.user = mockUser;
            mockRequest.body = {
                token: '123456',
                emailChangeToken: 'jwt-token',
            };

            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.verify as jest.Mock).mockReturnValue({
                id: 1,
                newEmail: 'existing@test.com',
                type: 'user',
            });
            (userService.findUserByEmail as jest.Mock).mockResolvedValue({ id: 2 } as User);

            await userController.verifyEmailChange(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(409);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email already in use.',
            });
        });
    });
});
