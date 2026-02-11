/**
 * @fileoverview Authentication Service
 * @description Handles user authentication, token management, and session persistence
 * @author Enterprise E-Commerce Team
 * @version 2.0.0
 */

import apiClient from './apiClient';
import { API_CONFIG } from '../constants';

/**
 * Authentication Service Class
 * @description Manages user authentication state and API calls
 */
class AuthService {
    constructor() {
        // Storage keys for consistent access
        this.TOKEN_KEY = 'auth_token';
        this.USER_KEY = 'auth_user';
    }

    /**
     * Authenticate user with email and password
     * @param {string} email - User's email address
     * @param {string} password - User's password
     * @returns {Promise<Object>} User data and token
     * @throws {Error} If login fails
     */
    async login(email, password) {
        try {
            const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.AUTH}/login`, {
                email,
                password
            });

            // Extract data from standardized API response
            const { user, token } = response.data;

            // Persist authentication data
            this.setToken(token);
            this.setUser(user);

            return response;
        } catch (error) {
            console.error('Login failed:', error);
            throw new Error(error.message || 'Login failed. Please try again.');
        }
    }

    /**
     * Register new user account
     * @param {Object} userData - User registration data
     * @param {string} userData.name - User's full name
     * @param {string} userData.email - User's email address
     * @param {string} userData.password - User's password
     * @returns {Promise<Object>} User data and token
     * @throws {Error} If registration fails
     */
    async register(userData) {
        try {
            const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.AUTH}/register`, userData);

            // Extract data from standardized API response
            const { user, token } = response.data;

            // Persist authentication data
            this.setToken(token);
            this.setUser(user);

            return response;
        } catch (error) {
            console.error('Registration failed:', error);
            throw new Error(error.message || 'Registration failed. Please try again.');
        }
    }

    /**
     * Logout user and clear session data
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            // Attempt to notify backend (optional - JWT is stateless)
            const token = this.getToken();
            
            if (token) {
                try {
                    await apiClient.post(`${API_CONFIG.ENDPOINTS.AUTH}/logout`);
                } catch (error) {
                    // Continue with logout even if API call fails
                    console.warn('Logout API call failed:', error);
                }
            }
        } finally {
            // Always clear local authentication data
            this.clearAuth();
        }
    }

    /**
     * Get current user profile from API
     * @returns {Promise<Object>} Current user profile
     * @throws {Error} If request fails or user not authenticated
     */
    async getCurrentUser() {
        try {
            const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.AUTH}/me`);
            const user = response.data.user;
            
            // Update stored user data
            this.setUser(user);
            
            return user;
        } catch (error) {
            console.error('Failed to fetch current user:', error);
            this.clearAuth();
            throw error;
        }
    }

    /**
     * Update user profile
     * @param {Object} profileData - Profile data to update
     * @returns {Promise<Object>} Updated user profile
     */
    async updateProfile(profileData) {
        try {
            const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.AUTH}/profile`, profileData);
            const user = response.data.user;
            
            // Update stored user data
            this.setUser(user);
            
            return user;
        } catch (error) {
            console.error('Profile update failed:', error);
            throw new Error(error.message || 'Failed to update profile');
        }
    }

    /**
     * Change user password
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Success response
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.AUTH}/change-password`, {
                currentPassword,
                newPassword
            });
            
            return response;
        } catch (error) {
            console.error('Password change failed:', error);
            throw new Error(error.message || 'Failed to change password');
        }
    }

    /**
     * Get stored authentication token
     * @returns {string|null} Authentication token or null
     */
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    /**
     * Store authentication token
     * @param {string} token - JWT token
     */
    setToken(token) {
        if (token) {
            localStorage.setItem(this.TOKEN_KEY, token);
        }
    }

    /**
     * Get stored user data
     * @returns {Object|null} User object or null
     */
    getUser() {
        try {
            const user = localStorage.getItem(this.USER_KEY);
            return user ? JSON.parse(user) : null;
        } catch (error) {
            console.error('Error parsing stored user data:', error);
            return null;
        }
    }

    /**
     * Store user data
     * @param {Object} user - User object
     */
    setUser(user) {
        if (user) {
            localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if user has valid token
     */
    isAuthenticated() {
        const token = this.getToken();
        const user = this.getUser();
        return !!(token && user);
    }

    /**
     * Check if user has admin role
     * @returns {boolean} True if user is admin
     */
    isAdmin() {
        const user = this.getUser();
        return user?.role === 'admin';
    }

    /**
     * Check if user has specific role
     * @param {string} role - Role to check
     * @returns {boolean} True if user has the role
     */
    hasRole(role) {
        const user = this.getUser();
        return user?.role === role;
    }

    /**
     * Clear all authentication data
     * @private
     */
    clearAuth() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    }

    /**
     * Initialize auth state from storage
     * @returns {Object|null} User object if authenticated, null otherwise
     */
    initAuth() {
        if (this.isAuthenticated()) {
            return this.getUser();
        }
        return null;
    }
}

// Export singleton instance
const authService = new AuthService();
export default authService;
