/**
 * @fileoverview Authentication Service Layer
 * @description Handles all authentication business logic including registration, login, and token management
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { BaseService } from '../core/BaseService.js';
import { AppError } from '../middleware/errorHandler.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication Service Class
 * @extends BaseService
 * @description Manages user authentication, registration, and token operations
 */
export class AuthService extends BaseService {
    constructor() {
        super(User);
        // Hash rounds for password encryption (10-12 recommended for production)
        this.HASH_ROUNDS = 12;
    }

    /**
     * Register new user with encrypted password
     * @param {Object} userData - User registration data
     * @param {string} userData.name - User's full name
     * @param {string} userData.email - User's email address
     * @param {string} userData.password - User's plain text password
     * @param {string} [userData.role='user'] - User role
     * @returns {Promise<Object>} Created user and authentication token
     * @throws {AppError} If user already exists or validation fails
     */
    async register(userData) {
        const { name, email, password, role = 'user' } = userData;

        // Check if user already exists
        const existingUser = await this.findOne({ email });
        if (existingUser) {
            throw new AppError('User already exists with this email', 400);
        }

        // Validate email format
        if (!this.isValidEmail(email)) {
            throw new AppError('Invalid email format', 400);
        }

        // Validate password strength
        const passwordValidation = this.validatePassword(password);
        if (!passwordValidation.isValid) {
            throw new AppError(passwordValidation.message, 400);
        }

        // Hash password with bcrypt
        const hashedPassword = await bcrypt.hash(password, this.HASH_ROUNDS);

        // Create user with hashed password
        const user = await this.create({
            name,
            email,
            password: hashedPassword,
            role,
            status: 'active',
            emailVerified: false
        });

        // Generate JWT token
        const token = this.generateToken(user);

        logger.info(`New user registered: ${email}`);

        return {
            user: this.sanitizeUser(user),
            token
        };
    }

    /**
     * Authenticate user and generate token
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @returns {Promise<Object>} User data and authentication token
     * @throws {AppError} If credentials are invalid or account is inactive
     */
    async login(email, password) {
        // Find user and include password field for comparison
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            throw new AppError('Invalid email or password', 401);
        }

        // Check if account is active
        if (user.status !== 'active') {
            throw new AppError('Account is inactive. Please contact support.', 401);
        }

        // Verify password using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new AppError('Invalid email or password', 401);
        }

        // Generate authentication token
        const token = this.generateToken(user);

        logger.info(`User logged in: ${email}`);

        return {
            user: this.sanitizeUser(user),
            token
        };
    }

    /**
     * Get user profile by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User profile data
     * @throws {AppError} If user not found
     */
    async getProfile(userId) {
        const user = await this.findByIdOrFail(userId);
        return this.sanitizeUser(user);
    }

    /**
     * Update user profile
     * @param {string} userId - User ID
     * @param {Object} updateData - Profile data to update
     * @returns {Promise<Object>} Updated user profile
     * @throws {AppError} If user not found or validation fails
     */
    async updateProfile(userId, updateData) {
        // Remove sensitive fields that shouldn't be updated via this method
        const { password, role, status, ...safeData } = updateData;

        const updatedUser = await this.updateOrFail(userId, safeData);
        return this.sanitizeUser(updatedUser);
    }

    /**
     * Change user password
     * @param {string} userId - User ID
     * @param {string} currentPassword - Current password for verification
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Success message
     * @throws {AppError} If current password is invalid or validation fails
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await User.findById(userId).select('+password');
        
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new AppError('Current password is incorrect', 401);
        }

        // Validate new password
        const passwordValidation = this.validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            throw new AppError(passwordValidation.message, 400);
        }

        // Hash and update new password
        user.password = await bcrypt.hash(newPassword, this.HASH_ROUNDS);
        await user.save();

        logger.info(`Password changed for user: ${user.email}`);

        return { message: 'Password changed successfully' };
    }

    /**
     * Verify JWT token and return user
     * @param {string} token - JWT token
     * @returns {Promise<Object>} User data
     * @throws {AppError} If token is invalid or user not found
     */
    async verifyToken(token) {
        try {
            // Decode and verify JWT token
            const decoded = jwt.verify(token, config.jwt.secret);
            const userId = decoded.userId || decoded.id;

            // Find user and verify account status
            const user = await this.findById(userId);
            
            if (!user) {
                throw new AppError('User no longer exists', 401);
            }

            if (user.status !== 'active') {
                throw new AppError('Account has been deactivated', 401);
            }

            return this.sanitizeUser(user);
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                throw new AppError('Invalid token', 401);
            }
            if (error.name === 'TokenExpiredError') {
                throw new AppError('Token expired', 401);
            }
            throw error;
        }
    }

    /**
     * Generate JWT token for user
     * @private
     * @param {Object} user - User document
     * @returns {string} JWT token
     */
    generateToken(user) {
        return jwt.sign(
            { 
                userId: user._id,
                role: user.role,
                email: user.email
            },
            config.jwt.secret,
            { expiresIn: config.jwt.expire }
        );
    }

    /**
     * Remove sensitive fields from user object
     * @private
     * @param {Object} user - User document
     * @returns {Object} Sanitized user object
     */
    sanitizeUser(user) {
        const userObj = user.toObject ? user.toObject() : user;
        const { password, __v, refreshToken, passwordResetToken, emailVerificationToken, ...sanitizedUser } = userObj;
        return sanitizedUser;
    }

    /**
     * Validate email format
     * @private
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid
     */
    isValidEmail(email) {
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate password strength
     * @private
     * @param {string} password - Password to validate
     * @returns {Object} Validation result with isValid and message
     */
    validatePassword(password) {
        if (!password || password.length < 6) {
            return {
                isValid: false,
                message: 'Password must be at least 6 characters long'
            };
        }

        // Check for at least one letter and one number (recommended)
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /\d/.test(password);

        if (!hasLetter || !hasNumber) {
            return {
                isValid: false,
                message: 'Password must contain at least one letter and one number'
            };
        }

        return { isValid: true };
    }

    /**
     * Find user by email
     * @param {string} email - Email address
     * @returns {Promise<Object|null>} User document or null
     */
    async findByEmail(email) {
        return await this.findOne({ email });
    }

    /**
     * Check if user is admin
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} True if user is admin
     */
    async isAdmin(userId) {
        const user = await this.findById(userId, { select: 'role' });
        return user?.role === 'admin';
    }
}
