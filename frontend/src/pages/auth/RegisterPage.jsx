import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import authService from '../../services/authService';
import { ErrorAlert, FieldError } from '../../components/common';
import { processApiError, getFieldClasses, getFieldError } from '../../utils/errorUtils';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================
// Yup schema for client-side registration form validation matching server rules
const registerSchema = yup.object().shape({
    // Name validation: 2-100 characters, whitespace trimmed
    name: yup
        .string()
        .required('Name is required')
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must not exceed 100 characters')
        .trim(),
    
    // Email validation: required, must be valid email format
    email: yup
        .string()
        .required('Email is required')
        .email('Please enter a valid email address')
        .trim(),
    
    // Password validation: min 8 chars, max 128 chars
    password: yup
        .string()
        .required('Password is required')
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters')
        .trim(),
    
    // Confirm password: must match the password field
    confirmPassword: yup
        .string()
        .required('Please confirm your password')
        .trim()
        .test('passwords-match', 'Passwords must match', function(value) {
            console.log('=== YUP PASSWORD VALIDATION ===');
            console.log('Password:', this.parent.password);
            console.log('Confirm Password:', value);
            console.log('Match:', this.parent.password === value);
            return this.parent.password === value;
        })
});

const RegisterPage = () => {
    // ========================================================================
    // STATE & HOOKS
    // ========================================================================
    const navigate = useNavigate();
    
    // Track loading and error states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState([]); // Array of error messages
    const [serverErrors, setServerErrors] = useState({}); // Field-specific server errors
    const [successMessage, setSuccessMessage] = useState(''); // Success message

    // Initialize React Hook Form with Yup validation
    const {
        register,           // Function to register input fields
        handleSubmit,       // Form submission handler
        reset,              // Function to reset form
        formState: { errors } // Validation errors object
    } = useForm({
        resolver: yupResolver(registerSchema), // Use Yup schema for validation
        mode: 'onBlur'      // Validate on blur for better UX
    });

    // ========================================================================
    // FORM SUBMISSION HANDLER
    // ========================================================================
    // Handle form submission after validation passes
    const onSubmit = async (data) => {
        // Clear any existing errors and success message
        setError([]);
        setServerErrors({});
        setSuccessMessage('');
        setIsLoading(true);

        // Log submission data for debugging (remove in production)
        console.log('=== REGISTRATION FORM SUBMITTED ===');
        console.log('Validated data:', {
            name: data.name,
            email: data.email,
            password: data.password,
            confirmPassword: data.confirmPassword,
            passwordLength: data.password.length,
            confirmPasswordLength: data.confirmPassword.length,
            passwordsMatch: data.password === data.confirmPassword,
            trimmedPasswordsMatch: data.password.trim() === data.confirmPassword.trim()
        });

        try {
            // Call registration service with validated data (trim passwords)
            await authService.register({
                name: data.name,
                email: data.email,
                password: data.password.trim(),
                confirmPassword: data.confirmPassword.trim()
            });
            
            // Registration successful - show success message and reset form
            setSuccessMessage('You are successfully registered! Now you can login.');
            reset(); // Clear the form
        } catch (err) {
            // Process API error using utility function
            const { fieldErrors, errorMessages, generalError } = processApiError(err);
            
            console.log('=== PROCESSED ERROR RESULT ===');
            console.log('Field Errors:', fieldErrors);
            console.log('Error Messages:', errorMessages);
            console.log('General Error:', generalError);
            
            // Set field-specific errors for form inputs
            setServerErrors(fieldErrors);
            
            // Set general error message for alert display
            if (Object.keys(fieldErrors).length > 0) {
                console.log('Setting error to errorMessages array:', errorMessages);
                // Show field-specific errors in alert
                setError(errorMessages);
            } else {
                console.log('Setting error to generalError:', generalError);
                // Show general error message
                setError([generalError]);
            }
        } finally {
            // Always reset loading state
            setIsLoading(false);
        }
    };

    // ========================================================================
    // RENDER
    // ========================================================================
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
                {/* Page Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
                    <p className="text-gray-600">Sign up to get started</p>
                </div>

                {/* Success Alert - Shows registration success message */}
                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            {/* Success Icon */}
                            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1">
                                <p className="text-green-600 text-sm font-semibold mb-2">
                                    {successMessage}
                                </p>
                                <Link 
                                    to="/login" 
                                    className="inline-flex items-center text-sm text-green-700 hover:text-green-800 font-medium underline"
                                >
                                    Go to Login Page →
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Alert - Shows server/validation errors */}
                <ErrorAlert 
                    errors={error} 
                    title="Validation Errors:" 
                    className="mb-6"
                />

                {/* Registration Form - Handled by React Hook Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                    {/* Name Input Field */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Full Name
                        </label>
                        <input
                            type="text"
                            {...register('name')} // Register with React Hook Form
                            className={getFieldClasses(errors, serverErrors, 'name')}
                            placeholder="John Doe"
                            autoComplete="name"
                        />
                        {/* Show validation error if exists (client-side or server-side) */}
                        <FieldError error={getFieldError(errors, serverErrors, 'name')} />
                    </div>

                    {/* Email Input Field */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            {...register('email')} // Register with React Hook Form
                            className={getFieldClasses(errors, serverErrors, 'email')}
                            placeholder="your@email.com"
                            autoComplete="email"
                        />
                        {/* Show validation error if exists (client-side or server-side) */}
                        <FieldError error={getFieldError(errors, serverErrors, 'email')} />
                    </div>

                    {/* Password Input Field */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            {...register('password')} // Register with React Hook Form
                            className={getFieldClasses(errors, serverErrors, 'password')}
                            placeholder="••••••••"
                            autoComplete="new-password"
                        />
                        {/* Show validation error if exists (client-side or server-side) */}
                        <FieldError error={getFieldError(errors, serverErrors, 'password')} />
                        {/* Password requirements hint - only show when no password error */}
                        {!getFieldError(errors, serverErrors, 'password') && (
                            <p className="mt-1 text-xs text-gray-500">
                                Must be between 8 and 128 characters
                            </p>
                        )}
                    </div>

                    {/* Confirm Password Input Field */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            {...register('confirmPassword')} // Register with React Hook Form
                            className={getFieldClasses(errors, serverErrors, 'confirmPassword')}
                            placeholder="••••••••"
                            autoComplete="new-password"
                        />
                        {/* Show validation error if exists (client-side or server-side) */}
                        <FieldError error={getFieldError(errors, serverErrors, 'confirmPassword')} />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                {/* Sign In Link */}
                <div className="mt-6 text-center">
                    <p className="text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
