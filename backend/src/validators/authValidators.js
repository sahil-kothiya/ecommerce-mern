import { body, param } from 'express-validator';

// ============================================================================
// REGISTRATION VALIDATOR
// ============================================================================
// Validates user registration data including name, email, password strength
export const registerValidator = [
    // Validate name: must be 2-100 characters, whitespace trimmed
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    
    // Validate email: must be valid format, normalized (lowercase, remove dots in Gmail)
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    
    // Validate password: minimum 8 characters, maximum 128 characters
    body('password')
        .trim() // Trim whitespace for consistency
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters'),
    
    // Validate password confirmation: must match password field
    body('confirmPassword')
        .trim() // Trim whitespace for consistency
        .custom((value, { req }) => {
            console.log('=== PASSWORD COMPARISON ===');
            console.log('Password:', req.body.password);
            console.log('Confirm Password:', value);
            console.log('Match:', value === req.body.password);
            return value === req.body.password;
        })
        .withMessage('Passwords do not match')
];

// ============================================================================
// LOGIN VALIDATOR
// ============================================================================
// Validates login credentials (email and password presence)
export const loginValidator = [
    // Validate email: must be valid format and normalized
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    
    // Validate password: must not be empty (password strength checked on registration)
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    // Validate rememberMe: optional boolean field for persistent login
    body('rememberMe')
        .optional()
        .isBoolean()
        .withMessage('Remember me must be a boolean value')
];

// ============================================================================
// PASSWORD UPDATE VALIDATOR
// ============================================================================
// Validates password change requests (requires current password for security)
export const updatePasswordValidator = [
    // Validate current password: required for authentication
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    
    // Validate new password: minimum 8 characters, maximum 128 characters
    body('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('New password must be between 8 and 128 characters'),
    
    // Validate password confirmation: must match new password
    body('confirmPassword')
        .custom((value, { req }) => value === req.body.newPassword)
        .withMessage('Passwords do not match')
];

// ============================================================================
// EMAIL VALIDATOR (for forgot password, email changes, etc.)
// ============================================================================
// Validates standalone email input for various auth operations
export const emailValidator = [
    // Validate email: must be valid format and normalized
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email')
];
