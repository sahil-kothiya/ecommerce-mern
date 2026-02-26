import { logger } from '../../utils/logger.js';

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import authService from '../../services/authService';
import { ErrorAlert, FieldError } from '../../components/common';
import { processApiError, getFieldClasses, getFieldError } from '../../utils/errorUtils';
import { useSiteSettings } from '../../context/SiteSettingsContext.jsx';
import { resolveImageUrl } from '../../utils/imageUrl';

const registerSchema = yup.object().shape({
        name: yup
        .string()
        .required('Name is required')
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must not exceed 100 characters')
        .trim(),
    
        email: yup
        .string()
        .required('Email is required')
        .email('Please enter a valid email address')
        .trim(),
    
        password: yup
        .string()
        .required('Password is required')
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters')
        .trim(),
    
        confirmPassword: yup
        .string()
        .required('Please confirm your password')
        .trim()
        .test('passwords-match', 'Passwords must match', function(value) {
            logger.info('=== YUP PASSWORD VALIDATION ===');
            logger.info('Password:', this.parent.password);
            logger.info('Confirm Password:', value);
            logger.info('Match:', this.parent.password === value);
            return this.parent.password === value;
        })
});

const RegisterPage = () => {
                const navigate = useNavigate();
    const { settings } = useSiteSettings();
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState([]);
    const [serverErrors, setServerErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const siteName = String(settings?.siteName || 'Enterprise E-Commerce').trim();
    const siteTagline = String(settings?.siteTagline || '').trim();
    const logoUrl = resolveImageUrl(settings?.logo, { placeholder: null });

        const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm({
        resolver: yupResolver(registerSchema),
        mode: 'onBlur'
    });

                    const onSubmit = async (data) => {
                setError([]);
        setServerErrors({});
        setSuccessMessage('');
        setIsLoading(true);

                logger.info('=== REGISTRATION FORM SUBMITTED ===');
        logger.info('Validated data:', {
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
                        await authService.register({
                name: data.name,
                email: data.email,
                password: data.password.trim(),
                confirmPassword: data.confirmPassword.trim()
            });
            
                        setSuccessMessage('You are successfully registered! Now you can login.');
            reset();
        } catch (err) {
                        const { fieldErrors, errorMessages, generalError } = processApiError(err);
            
            logger.info('=== PROCESSED ERROR RESULT ===');
            logger.info('Field Errors:', fieldErrors);
            logger.info('Error Messages:', errorMessages);
            logger.info('General Error:', generalError);
            
                        setServerErrors(fieldErrors);

                        const hasFieldErrors = Object.keys(fieldErrors).length > 0;
            if (!hasFieldErrors) {
                const messages = errorMessages.length > 0 ? errorMessages : (generalError ? [generalError] : []);
                setError(messages);
            }
        } finally {
                        setIsLoading(false);
        }
    };

                return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 sm:py-14">
            <div className="absolute left-8 top-6 h-52 w-52 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="absolute bottom-8 right-8 h-52 w-52 rounded-full bg-cyan-500/20 blur-3xl" />

            <div className="interactive-card relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl backdrop-blur md:grid-cols-2">
                <section className="p-6 sm:p-8 md:p-10">
                    <div className="mb-7">
                        {logoUrl && (
                            <img src={logoUrl} alt={siteName} className="mb-3 h-10 w-10 rounded-lg object-cover" />
                        )}
                        <h1 className="text-3xl font-bold text-slate-900">Create your account</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Set up your {siteName} workspace in minutes.
                        </p>
                    </div>

                    {successMessage && (
                        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex items-start gap-2">
                                <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                    <p className="mb-2 text-sm font-semibold text-emerald-700">{successMessage}</p>
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center text-sm font-medium text-emerald-700 underline transition-colors hover:text-emerald-800"
                                    >
                                        Go to Login Page →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    <ErrorAlert
                        errors={error}
                        onClose={() => setError([])}
                        className="mb-5"
                    />

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                            <input
                                type="text"
                                {...register('name')}
                                className={getFieldClasses(errors, serverErrors, 'name')}
                                placeholder="John Doe"
                                autoComplete="name"
                            />
                            <FieldError error={getFieldError(errors, serverErrors, 'name')} />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
                            <input
                                type="email"
                                {...register('email')}
                                className={getFieldClasses(errors, serverErrors, 'email')}
                                placeholder="your@email.com"
                                autoComplete="email"
                            />
                            <FieldError error={getFieldError(errors, serverErrors, 'email')} />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                            <input
                                type="password"
                                {...register('password')}
                                className={getFieldClasses(errors, serverErrors, 'password')}
                                placeholder="••••••••"
                                autoComplete="new-password"
                            />
                            <FieldError error={getFieldError(errors, serverErrors, 'password')} />

                            {!getFieldError(errors, serverErrors, 'password') && (
                                <p className="mt-1 text-xs text-slate-500">Must be between 8 and 128 characters</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</label>
                            <input
                                type="password"
                                {...register('confirmPassword')}
                                className={getFieldClasses(errors, serverErrors, 'confirmPassword')}
                                placeholder="••••••••"
                                autoComplete="new-password"
                            />
                            <FieldError error={getFieldError(errors, serverErrors, 'confirmPassword')} />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-neo tap-bounce hover-glow w-full rounded-xl py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoading ? 'Creating Account...' : 'Create Workspace'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </section>

                <aside className="hidden bg-gradient-to-br from-slate-900 via-violet-900 to-fuchsia-900 p-10 text-white md:flex md:flex-col md:justify-between">
                    <div>
                        <p className="mb-4 inline-flex rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-100">
                            {siteTagline || 'New Merchant Setup'}
                        </p>
                        <h2 className="text-3xl font-bold leading-tight">Build your next big storefront.</h2>
                        <p className="mt-4 text-sm text-violet-100/90">
                            Launch products, automate operations, and keep every channel synchronized from day one.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-violet-50">
                            Unified dashboard with customer, catalog, and order visibility.
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-violet-100">
                            <div className="rounded-xl border border-white/20 bg-white/10 p-3">Fast onboarding</div>
                            <div className="rounded-xl border border-white/20 bg-white/10 p-3">Role-based access</div>
                            <div className="rounded-xl border border-white/20 bg-white/10 p-3">Secure auth</div>
                            <div className="rounded-xl border border-white/20 bg-white/10 p-3">Scalable stack</div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default RegisterPage;
