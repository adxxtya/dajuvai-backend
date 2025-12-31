import { AuthService, SignupInput } from '../AuthService';
import { UserRepository } from '../../../repositories/UserRepository';
import { TokenService } from '../TokenService';
import { SessionService } from '../SessionService';
import { User, UserRole } from '../../../entities/user.entity';
import { Session } from '../../../entities/session.entity';
import { APIError } from '../../../utils/errors/ApiError';
import { ErrorCode } from '../../../utils/errors/ErrorCodes';
import bcrypt from 'bcrypt';
import { Request } from 'express';

// Mock dependencies
jest.mock('../../../repositories/UserRepository');
jest.mock('../TokenService');
jest.mock('../SessionService');
jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockTokenService: jest.Mocked<TokenService>;
  let mockSessionService: jest.Mocked<SessionService>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mock instances
    mockUserRepository = new UserRepository(null as any) as jest.Mocked<UserRepository>;
    mockTokenService = new TokenService() as jest.Mocked<TokenService>;
    mockSessionService = new SessionService(null as any) as jest.Mocked<SessionService>;

    // Create AuthService instance with mocked dependencies
    authService = new AuthService(
      mockUserRepository,
      mockTokenService,
      mockSessionService
    );
  });

  describe('signup', () => {
    const signupData: SignupInput = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      fullName: 'Test User',
      phoneNumber: '+1234567890',
    };

    it('should hash password, create user, generate tokens, and create session', async () => {
      // Arrange
      const hashedPassword = 'hashed_password';
      const mockUser = {
        id: 1,
        email: signupData.email,
        password: hashedPassword,
        fullName: signupData.fullName,
        phoneNumber: signupData.phoneNumber,
        role: UserRole.USER,
        isVerified: false,
      } as User;

      const mockTokens = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      const mockSession = {
        id: 'session_id',
        userId: mockUser.id,
      } as Session;

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockTokenService.generateTokenPair.mockReturnValue(mockTokens);
      mockSessionService.createSession.mockResolvedValue(mockSession);

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(signupData.email);
      expect(mockUserRepository.findByPhoneNumber).toHaveBeenCalledWith(signupData.phoneNumber);
      expect(bcrypt.hash).toHaveBeenCalledWith(signupData.password, 12);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockTokenService.generateTokenPair).toHaveBeenCalledWith(mockUser);
      expect(mockSessionService.createSession).toHaveBeenCalledWith(
        mockUser,
        mockTokens.refreshToken,
        expect.any(Object)
      );
      expect(result).toEqual({
        user: mockUser,
        tokens: mockTokens,
        sessionId: mockSession.id,
      });
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      const existingUser = { id: 1, email: signupData.email } as User;
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(authService.signup(signupData)).rejects.toThrow(APIError);
      await expect(authService.signup(signupData)).rejects.toMatchObject({
        status: 409,
        message: 'Email already registered',
      });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error if phone number already exists', async () => {
      // Arrange
      const existingUser = { id: 2, phoneNumber: signupData.phoneNumber } as User;
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByPhoneNumber.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(authService.signup(signupData)).rejects.toThrow(APIError);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const email = 'test@example.com';
    const password = 'SecurePass123!';
    const mockReq = {
      headers: { 'user-agent': 'test-agent' },
      ip: '127.0.0.1',
    } as Request;

    it('should verify password, generate tokens, and create session', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email,
        password: 'hashed_password',
        isVerified: true,
        role: UserRole.USER,
      } as User;

      const mockTokens = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      const mockSession = {
        id: 'session_id',
        userId: mockUser.id,
      } as Session;

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockTokenService.generateTokenPair.mockReturnValue(mockTokens);
      mockSessionService.createSession.mockResolvedValue(mockSession);

      // Act
      const result = await authService.login(email, password, mockReq);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
      expect(mockTokenService.generateTokenPair).toHaveBeenCalledWith(mockUser);
      expect(mockSessionService.createSession).toHaveBeenCalledWith(
        mockUser,
        mockTokens.refreshToken,
        mockReq
      );
      expect(result).toEqual({
        user: mockUser,
        tokens: mockTokens,
        sessionId: mockSession.id,
      });
    });

    it('should throw error for invalid credentials (user not found)', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(email, password, mockReq)).rejects.toThrow(APIError);
      await expect(authService.login(email, password, mockReq)).rejects.toMatchObject({
        status: 401,
        message: 'Invalid email or password',
      });
      expect(mockTokenService.generateTokenPair).not.toHaveBeenCalled();
    });

    it('should throw error for invalid credentials (wrong password)', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email,
        password: 'hashed_password',
        isVerified: true,
      } as User;

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(email, password, mockReq)).rejects.toThrow(APIError);
      await expect(authService.login(email, password, mockReq)).rejects.toMatchObject({
        status: 401,
        message: 'Invalid email or password',
      });
      expect(mockTokenService.generateTokenPair).not.toHaveBeenCalled();
    });

    it('should throw error for unverified user', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email,
        password: 'hashed_password',
        isVerified: false,
      } as User;

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(authService.login(email, password, mockReq)).rejects.toThrow(APIError);
      await expect(authService.login(email, password, mockReq)).rejects.toMatchObject({
        status: 403,
        message: 'Please verify your email before logging in',
      });
      expect(mockTokenService.generateTokenPair).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should revoke session', async () => {
      // Arrange
      const userId = 1;
      const sessionId = 'session_id';
      mockSessionService.revokeSession.mockResolvedValue(undefined);

      // Act
      await authService.logout(userId, sessionId);

      // Assert
      expect(mockSessionService.revokeSession).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('changePassword', () => {
    const userId = 1;
    const oldPassword = 'OldPass123!';
    const newPassword = 'NewPass456!';

    it('should verify old password, hash new password, and revoke all sessions', async () => {
      // Arrange
      const mockUser = {
        id: userId,
        password: 'old_hashed_password',
      } as User;

      const newHashedPassword = 'new_hashed_password';

      mockUserRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue(newHashedPassword);
      mockUserRepository.update.mockResolvedValue(mockUser);
      mockSessionService.revokeAllUserSessions.mockResolvedValue(undefined);

      // Act
      await authService.changePassword(userId, oldPassword, newPassword);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(oldPassword, mockUser.password);
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        password: newHashedPassword,
      });
      expect(mockSessionService.revokeAllUserSessions).toHaveBeenCalledWith(userId);
    });

    it('should throw error for incorrect old password', async () => {
      // Arrange
      const mockUser = {
        id: userId,
        password: 'old_hashed_password',
      } as User;

      mockUserRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.changePassword(userId, oldPassword, newPassword)
      ).rejects.toThrow(APIError);
      await expect(
        authService.changePassword(userId, oldPassword, newPassword)
      ).rejects.toMatchObject({
        status: 400,
        message: 'Current password is incorrect',
      });
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(mockSessionService.revokeAllUserSessions).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.changePassword(userId, oldPassword, newPassword)
      ).rejects.toThrow(APIError);
      await expect(
        authService.changePassword(userId, oldPassword, newPassword)
      ).rejects.toMatchObject({
        status: 404,
        message: 'User not found',
      });
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });
});
