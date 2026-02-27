import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import authService from '../../services/authService';
import { ErrorAlert, FieldError } from '../../components/common';
import { processApiError, getFieldClasses, getFieldError } from '../../utils/errorUtils';
import { useSiteSettings } from '../../context/useSiteSettings';
import { resolveImageUrl } from '../../utils/imageUrl';

const registerSchema = yup.object().shape({
        name: yup
        .string()
        .required('Name is required')
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must not exceed 100 characters'),
    
        email: yup
        .string()
        .required('Email is required')
        .email('Please enter a valid email address'),
    
        password: yup
        .string()
        .required('Password is required')
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters'),
    
        confirmPassword: yup
        .string()
        .required('Please confirm your password')
        .oneOf([yup.ref('password')], 'Passwords must match')
});

const RegisterPage = () => {
                const navigate = useNavigate();
    const { settings } = useSiteSettings();
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState([]);
    const [serverErrors, setServerErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-6">
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
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    {...register('password')}
                                    className={getFieldClasses(errors, serverErrors, 'password')}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                            <FieldError error={getFieldError(errors, serverErrors, 'password')} />

                            {!getFieldError(errors, serverErrors, 'password') && (
                                <p className="mt-1 text-xs text-slate-500">Must be between 8 and 128 characters</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    {...register('confirmPassword')}
                                    className={getFieldClasses(errors, serverErrors, 'confirmPassword')}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(prev => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? (
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
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
