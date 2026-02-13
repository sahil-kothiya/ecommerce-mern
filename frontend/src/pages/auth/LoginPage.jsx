import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import authService from '../../services/authService';
import { ErrorAlert, FieldError } from '../../components/common';
import { processApiError, getFieldClasses, getFieldError } from '../../utils/errorUtils';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================
// Yup schema for client-side form validation with custom error messages
const loginSchema = yup.object().shape({
    // Email validation: required, must be valid email format
    email: yup
        .string()
        .required('Email is required')
        .email('Please enter a valid email address')
        .trim(),
    
    // Password validation: required field (strength validated on server)
    password: yup
        .string()
        .required('Password is required')
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters'),
    
    // Remember me: optional boolean for persistent login
    rememberMe: yup
        .boolean()
        .default(false)
});

const LoginPage = () => {
    // ========================================================================
    // STATE & HOOKS
    // ========================================================================
    const navigate = useNavigate();
    const location = useLocation();
    
    // Track loading and error states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState([]); // Array of error messages
    const [serverErrors, setServerErrors] = useState({}); // Field-specific server errors

    // Get redirect path from location state, default to home page
    const from = location.state?.from?.pathname || '/';

    // Initialize React Hook Form with Yup validation
    const {
        register,           // Function to register input fields
        handleSubmit,       // Form submission handler
        formState: { errors }, // Validation errors object
        watch,             // Watch form values for real-time updates
        setValue           // Programmatically set form field values
    } = useForm({
        resolver: yupResolver(loginSchema), // Use Yup schema for validation
        mode: 'onBlur',     // Validate on blur for better UX
        defaultValues: {
            email: '',
            password: '',
            rememberMe: false
        }
    });

    // Watch rememberMe checkbox for visual feedback
    const rememberMeValue = watch('rememberMe');

    // ========================================================================
    // SESSION EXPIRATION HANDLER
    // ========================================================================
    // Check for session expiration flag on component mount
    useEffect(() => {
        const sessionExpired = sessionStorage.getItem('sessionExpired');
        
        if (sessionExpired === 'true') {
            // Clear the flag
            sessionStorage.removeItem('sessionExpired');
            
            // Show session expired alert
            toast.error('Your session has expired. Please login again.', {
                duration: 5000,
                position: 'top-center',
                id: 'session-expired-alert'
            });
        }
    }, []);

    // ========================================================================
    // QUICK LOGIN HANDLERS (for demo/testing purposes)
    // ========================================================================
    /**
     * Auto-login with admin credentials
     * Sets form values and submits automatically
     */
    const handleAdminLogin = async () => {
        // Set admin credentials from demo data
        setValue('email', 'admin@admin.com');
        setValue('password', 'password123');
        setValue('rememberMe', true);
        
        // Submit form programmatically after setting values
        handleSubmit(onSubmit)();
    };

    /**
     * Auto-login with regular user credentials
     * Sets form values and submits automatically
     */
    const handleUserLogin = async () => {
        // Set user credentials from demo data
        setValue('email', 'user@admin.com');
        setValue('password', 'password123');
        setValue('rememberMe', false);
        
        // Submit form programmatically after setting values
        handleSubmit(onSubmit)();
    };

    // ========================================================================
    // FORM SUBMISSION HANDLER
    // ========================================================================
    // Handle form submission after validation passes
    const onSubmit = async (data) => {
        // Clear any existing errors
        setError([]);
        setServerErrors({});
        setIsLoading(true);

        // Log submission data for debugging (remove in production)
        console.log('=== LOGIN FORM SUBMITTED ===');
        console.log('Validated data:', {
            email: data.email,
            rememberMe: data.rememberMe,
            rememberMeType: typeof data.rememberMe
        });

        try {
            // Call authentication service with validated data
            await authService.login(data.email, data.password, data.rememberMe);
            
            // Redirect based on user role
            if (authService.isAdmin()) {
                // Admin users go to product management
                navigate('/admin/products', { replace: true });
            } else {
                // Regular users go to their dashboard
                navigate('/dashboard', { replace: true });
            }
        } catch (err) {
            // Process API error using utility function
            const { fieldErrors, errorMessages, generalError } = processApiError(err);
            
            // Set field-specific errors for form inputs
            setServerErrors(fieldErrors);
            
            // Set general error message for alert display
            if (Object.keys(fieldErrors).length > 0) {
                // Show field-specific errors in alert
                setError(errorMessages);
            } else {
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                    <p className="text-gray-600">Sign in to your account</p>
                </div>

                {/* Error Alert - Shows server/validation errors */}
                <ErrorAlert 
                    errors={error} 
                    title="Validation Errors:" 
                    className="mb-6"
                />

                {/* Login Form - Handled by React Hook Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
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
                            autoComplete="current-password"
                        />
                        {/* Show validation error if exists (client-side or server-side) */}
                        <FieldError error={getFieldError(errors, serverErrors, 'password')} />
                    </div>

                    {/* Remember Me & Forgot Password Row */}
                    <div className="flex items-center justify-between">
                        {/* Remember Me Checkbox */}
                        <label className="flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                {...register('rememberMe')} // Register with React Hook Form
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                            />
                            <span className="ml-2 text-sm text-gray-600">
                                Remember me 
                                {/* Visual indicator when checkbox is checked */}
                                {rememberMeValue && (
                                    <span className="text-green-600 font-semibold"> ✓ Enabled</span>
                                )}
                            </span>
                        </label>
                        
                        {/* Forgot Password Link */}
                        <Link 
                            to="/forgot-password" 
                            className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                {/* Sign Up Link */}
                <div className="mt-6 text-center">
                    <p className="text-gray-600">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                            Sign up
                        </Link>
                    </p>
                </div>

                {/* Quick Login Buttons - For Demo/Testing */}
                <div className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
                    <p className="text-sm font-semibold text-indigo-900 mb-3">Quick Login (Demo):</p>
                    <div className="grid grid-cols-2 gap-3">
                        {/* Admin Quick Login Button */}
                        <button
                            type="button"
                            onClick={handleAdminLogin}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Login as Admin
                        </button>

                        {/* User Quick Login Button */}
                        <button
                            type="button"
                            onClick={handleUserLogin}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Login as User
                        </button>
                    </div>
                </div>

                {/* Demo Credentials Information */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-semibold text-blue-900 mb-2">Or use these credentials:</p>
                    <div className="text-xs text-blue-800 space-y-1">
                        <p><strong>Admin:</strong> admin@admin.com / password123</p>
                        <p><strong>User:</strong> user@admin.com / password123</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
