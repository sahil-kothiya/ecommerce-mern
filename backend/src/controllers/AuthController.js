// ============================================================================
// AUTHENTICATION CONTROLLER
// ============================================================================
// Handles user authentication operations: registration, login, logout, profile management
// All business logic delegated to AuthService, this controller focuses on HTTP handling

import { BaseController } from '../core/BaseController.js';
import { AuthService } from '../services/AuthService.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication Controller Class
 * 
 * Manages HTTP endpoints for user authentication and account operations
 * Extends BaseController for consistent error handling and response formatting
 */
export class AuthController extends BaseController {
    constructor() {
        // Initialize with AuthService for business logic delegation
        const authService = new AuthService();
        super(authService);
    }

    // ========================================================================
    // USER REGISTRATION
    // ========================================================================
    /**
     * Register new user account
     * 
     * Validates input, creates user account, and returns JWT token
     * Password is automatically hashed in the User model pre-save hook
     * 
     * @route POST /api/auth/register
     * @access Public
     */
    register = this.catchAsync(async (req, res) => {
        const { name, email, password, confirmPassword } = req.body;

        // Log incoming data for debugging
        logger.info('=== REGISTER CONTROLLER ===');
        logger.info('Request body:', { name, email, password: '***', confirmPassword: '***' });

        // Validate required fields (throws 400 error if missing)
        this.validateRequiredFields(req.body, ['name', 'email', 'password']);

        // Delegate user creation to service layer
        const { user, token } = await this.service.register({
            name,
            email,
            password
        });

        // Log registration for audit trail
        this.logAction('User Registration', { email, userId: user._id });

        // Send 201 Created response with user data and JWT token
        this.sendSuccess(
            res,
            { user, token },
            201,
            'User registered successfully'
        );
    });

    // ========================================================================
    // USER LOGIN
    // ========================================================================
    /**
     * Authenticate user with email and password
     * 
     * Validates credentials, generates JWT tokens (access + refresh if remember me)
     * Sets HTTP-only cookies for secure token storage
     * 
     * @route POST /api/auth/login
     * @access Public
     */
    login = this.catchAsync(async (req, res) => {
        const { email, password, rememberMe: rememberMeRaw } = req.body;

        // Log incoming request for debugging (helps diagnose client/server data type issues)
        logger.info('Login request received:', { 
            email, 
            rememberMeRaw, 
            rememberMeType: typeof rememberMeRaw,
            body: req.body 
        });

        // Validate required credentials
        this.validateRequiredFields(req.body, ['email', 'password']);

        // Parse rememberMe as boolean - handles multiple formats from different clients
        // Accepts: true, "true", 1 (all evaluate to true)
        // Accepts: false, "false", 0, undefined, null (all evaluate to false)
        const rememberMe = Boolean(rememberMeRaw === true || rememberMeRaw === 'true' || rememberMeRaw === 1);

        // Authenticate user and generate tokens with service layer
        const result = await this.service.login(email, password, rememberMe);

        // Log successful login for security audit
        this.logAction('User Login', { 
            email, 
            userId: result.user._id,
            rememberMe,
            hasRefreshToken: !!result.refreshToken
        });

        // Set access token cookie (short-lived for security)
        this.setTokenCookie(res, 'accessToken', result.accessToken, {
            maxAge: 15 * 60 * 1000 // 15 minutes in milliseconds
        });

        // Set refresh token cookie only if remember me is enabled (long-lived)
        if (rememberMe && result.refreshToken) {
            this.setTokenCookie(res, 'refreshToken', result.refreshToken, {
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
            });
        }

        // Send success response with user data and tokens
        this.sendSuccess(
            res,
            {
                user: result.user,
                token: result.token,
                accessToken: result.accessToken,
                expiresIn: result.expiresIn,
                // Include refresh token data only if present
                ...(result.refreshToken && {
                    refreshToken: result.refreshToken,
                    refreshExpiresIn: result.refreshExpiresIn
                })
            },
            200,
            rememberMe ? 'Login successful - Remember me enabled' : 'Login successful'
        );
    });

    // ========================================================================
    // GET USER PROFILE
    // ========================================================================
    /**
     * Get authenticated user's profile data
     * 
     * Returns current user's information based on JWT token
     * Requires authentication via protect middleware
     * 
     * @route GET /api/auth/me
     * @access Private
     */
    getProfile = this.catchAsync(async (req, res) => {
        // Extract user ID from authenticated request (set by protect middleware)
        const userId = this.getUserId(req);

        // Fetch user profile from service layer
        const user = await this.service.getProfile(userId);

        this.sendSuccess(res, { user });
    });

    /** Update user profile */
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

    /** Change user password */
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

    /** Logout user */
    logout = this.catchAsync(async (req, res) => {
        const userId = this.getUserId(req);

        // Revoke refresh token if exists
        await this.service.revokeRefreshToken(userId);

        // Clear cookies
        this.clearTokenCookie(res, 'accessToken');
        this.clearTokenCookie(res, 'refreshToken');

        this.logAction('User Logout', { userId });

        this.sendSuccess(
            res,
            { message: 'Logged out successfully' },
            200
        );
    });

    /** Refresh access token using refresh token */
    refreshToken = this.catchAsync(async (req, res) => {
        // Try to get refresh token from body, cookie, or authorization header
        let refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

        if (!refreshToken) {
            throw new AppError('Refresh token is required', 401);
        }

        // Get new access token using refresh token
        const result = await this.service.refreshAccessToken(refreshToken);

        // Set new access token cookie
        this.setTokenCookie(res, 'accessToken', result.accessToken, {
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        this.logAction('Token Refreshed', { userId: result.user._id });

        this.sendSuccess(
            res,
            result,
            200,
            'Token refreshed successfully'
        );
    });
}
