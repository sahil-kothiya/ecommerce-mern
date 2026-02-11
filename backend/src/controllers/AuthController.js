/**
 * @fileoverview Authentication Controller
 * @description Handles HTTP requests for user authentication including registration, login, and profile management
 * @author Enterprise E-Commerce Team
 * @version 2.0.0
 */

import { BaseController } from '../core/BaseController.js';
import { AuthService } from '../services/AuthService.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication Controller Class
 * @extends BaseController
 * @description Manages authentication-related HTTP endpoints
 */
export class AuthController extends BaseController {
    constructor() {
        const authService = new AuthService();
        super(authService);
    }

    /**
     * Register new user
     * @route POST /api/auth/register
     * @access Public
     * @param {Object} req - Express request object
     * @param {Object} req.body - Request body
     * @param {string} req.body.name - User's full name
     * @param {string} req.body.email - User's email address
     * @param {string} req.body.password - User's password
     * @param {Object} res - Express response object
     * @returns {Promise<void>}
     */
    register = this.catchAsync(async (req, res) => {
        const { name, email, password } = req.body;

        // Validate required fields
        this.validateRequiredFields(req.body, ['name', 'email', 'password']);

        // Call service layer for business logic
        const { user, token } = await this.service.register({
            name,
            email,
            password
        });

        this.logAction('User Registration', { email, userId: user._id });

        // Send success response with 201 status code
        this.sendSuccess(
            res,
            { user, token },
            201,
            'User registered successfully'
        );
    });

    /**
     * Authenticate user and generate token
     * @route POST /api/auth/login
     * @access Public
     * @param {Object} req - Express request object
     * @param {Object} req.body - Request body
     * @param {string} req.body.email - User's email address
     * @param {string} req.body.password - User's password
     * @param {Object} res - Express response object
     * @returns {Promise<void>}
     */
    login = this.catchAsync(async (req, res) => {
        const { email, password } = req.body;

        // Validate required fields
        this.validateRequiredFields(req.body, ['email', 'password']);

        // Authenticate user via service layer
        const { user, token } = await this.service.login(email, password);

        this.logAction('User Login', { email, userId: user._id });

        // Send success response
        this.sendSuccess(
            res,
            { user, token },
            200,
            'Login successful'
        );
    });

    /**
     * Get authenticated user's profile
     * @route GET /api/auth/me
     * @access Protected
     * @param {Object} req - Express request object with authenticated user
     * @param {Object} res - Express response object
     * @returns {Promise<void>}
     */
    getProfile = this.catchAsync(async (req, res) => {
        const userId = this.getUserId(req);

        // Fetch user profile from service layer
        const user = await this.service.getProfile(userId);

        this.sendSuccess(res, { user });
    });

    /**
     * Update user profile
     * @route PUT /api/auth/profile
     * @access Protected
     * @param {Object} req - Express request object with authenticated user
     * @param {Object} req.body - Profile data to update
     * @param {Object} res - Express response object
     * @returns {Promise<void>}
     */
    updateProfile = this.catchAsync(async (req, res) => {
        const userId = this.getUserId(req);
        const updateData = req.body;

        // Update profile via service layer
        const user = await this.service.updateProfile(userId, updateData);

        this.logAction('Profile Updated', { userId });

        this.sendSuccess(
            res,
            { user },
            200,
            'Profile updated successfully'
        );
    });

    /**
     * Change user password
     * @route PUT /api/auth/change-password
     * @access Protected
     * @param {Object} req - Express request object with authenticated user
     * @param {Object} req.body - Password change data
     * @param {string} req.body.currentPassword - Current password
     * @param {string} req.body.newPassword - New password
     * @param {Object} res - Express response object
     * @returns {Promise<void>}
     */
    changePassword = this.catchAsync(async (req, res) => {
        const userId = this.getUserId(req);
        const { currentPassword, newPassword } = req.body;

        // Validate required fields
        this.validateRequiredFields(req.body, ['currentPassword', 'newPassword']);

        // Change password via service layer
        const result = await this.service.changePassword(
            userId,
            currentPassword,
            newPassword
        );

        this.logAction('Password Changed', { userId });

        this.sendSuccess(res, result, 200);
    });

    /**
     * Logout user (client-side token removal)
     * @route POST /api/auth/logout
     * @access Protected
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Promise<void>}
     */
    logout = this.catchAsync(async (req, res) => {
        const userId = this.getUserId(req);

        this.logAction('User Logout', { userId });

        // Note: With JWT, logout is primarily handled client-side by removing the token
        // This endpoint confirms the logout action and can be extended for token blacklisting
        this.sendSuccess(
            res,
            { message: 'Logged out successfully' },
            200
        );
    });
}
