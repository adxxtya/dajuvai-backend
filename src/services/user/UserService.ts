import { DataSource } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Address } from '../../entities/address.entity';
import { APIError } from '../../utils/ApiError.utils';
import { UserRepository } from '../../repositories/UserRepository';
import { SessionService } from '../auth/SessionService';
import { SessionRepository } from '../../repositories/SessionRepository';
import { IUpdateUserRequest } from '../../interface/user.interface';
import bcrypt from 'bcrypt';

/**
 * Refactored User Service using repository pattern
 * Focuses on profile management (authentication moved to AuthService)
 */
export class UserService {
    private userRepository: UserRepository;
    private sessionService: SessionService;
    private addressRepository;

    constructor(private dataSource: DataSource) {
        this.userRepository = new UserRepository(dataSource);
        const sessionRepository = new SessionRepository(dataSource);
        this.sessionService = new SessionService(sessionRepository);
        this.addressRepository = dataSource.getRepository(Address);
    }

    /**
     * Get user profile by ID
     */
    async getProfile(userId: number): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['address']
        });

        if (!user) {
            throw new APIError(404, 'User not found');
        }

        // Remove sensitive fields
        delete user.password;
        delete user.resetToken;
        delete user.resetTokenExpire;

        return user;
    }

    /**
     * Update user profile
     * Validates email and phone uniqueness
     */
    async updateProfile(userId: number, data: IUpdateUserRequest): Promise<User> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new APIError(404, 'User not found');
        }

        // Validate email uniqueness if changing
        if (data.email && data.email !== user.email) {
            const existingUser = await this.userRepository.findByEmail(data.email);
            if (existingUser) {
                throw new APIError(409, 'Email already in use');
            }
        }

        // Validate phone uniqueness if changing
        if (data.phoneNumber && data.phoneNumber !== user.phoneNumber) {
            const existingUser = await this.userRepository.findByPhoneNumber(data.phoneNumber);
            if (existingUser) {
                throw new APIError(409, 'Phone number already in use');
            }
        }

        // Update address if provided
        if (data.address) {
            if (user.address) {
                // Update existing address
                await this.addressRepository.update(user.address.id, data.address);
            } else {
                // Create new address
                const newAddress = this.addressRepository.create({
                    ...data.address,
                    userId: user.id
                });
                await this.addressRepository.save(newAddress);
            }
        }

        // Update user fields
        const { address, ...userData } = data;
        const updatedUser = await this.userRepository.update(userId, userData);

        // Remove sensitive fields
        delete updatedUser.password;
        delete updatedUser.resetToken;
        delete updatedUser.resetTokenExpire;

        return updatedUser;
    }

    /**
     * Update password and revoke all sessions
     */
    async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new APIError(404, 'User not found');
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new APIError(401, 'Current password is incorrect');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await this.userRepository.update(userId, { password: hashedPassword });

        // Revoke all sessions for security
        await this.sessionService.revokeAllUserSessions(userId);
    }

    /**
     * Delete user account
     */
    async deleteAccount(userId: number): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new APIError(404, 'User not found');
        }

        // Revoke all sessions
        await this.sessionService.revokeAllUserSessions(userId);

        // Delete user (cascade will handle related entities)
        await this.userRepository.delete(userId);
    }

    /**
     * Get user by ID (internal use)
     */
    async getUserById(userId: number): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['address']
        });

        if (!user) {
            throw new APIError(404, 'User not found');
        }

        return user;
    }

    /**
     * Check if email exists
     */
    async emailExists(email: string): Promise<boolean> {
        const user = await this.userRepository.findByEmail(email);
        return !!user;
    }

    /**
     * Check if phone number exists
     */
    async phoneNumberExists(phoneNumber: string): Promise<boolean> {
        const user = await this.userRepository.findByPhoneNumber(phoneNumber);
        return !!user;
    }
}
