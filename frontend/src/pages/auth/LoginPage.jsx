import { logger } from '../../utils/logger.js';

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import authService from '../../services/authService';
import { ErrorAlert, FieldError } from '../../components/common';
import { processApiError, getFieldClasses, getFieldError } from '../../utils/errorUtils';

const loginSchema = yup.object().shape({
        email: yup
        .string()
        .required('Email is required')
        .email('Please enter a valid email address')
        .trim(),
    
        password: yup
        .string()
        .required('Password is required')
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters'),
    
        rememberMe: yup
        .boolean()
        .default(false)
});

const LoginPage = () => {
                const navigate = useNavigate();
    const location = useLocation();
    
        const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState([]);
    const [serverErrors, setServerErrors] = useState({});

        const from = location.state?.from?.pathname || '/';

        const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue
    } = useForm({
        resolver: yupResolver(loginSchema),
        mode: 'onBlur',
        defaultValues: {
            email: '',
            password: '',
            rememberMe: false
        }
    });

        const rememberMeValue = watch('rememberMe');

                    useEffect(() => {
        const sessionExpired = sessionStorage.getItem('sessionExpired');
        
        if (sessionExpired === 'true') {
                        sessionStorage.removeItem('sessionExpired');
            
                        toast.error('Your session has expired. Please login again.', {
                duration: 5000,
                position: 'top-center',
                id: 'session-expired-alert'
            });
        }
    }, []);

const handleAdminLogin = async () => {
                setValue('email', 'admin@admin.com');
        setValue('password', 'password123');
        setValue('rememberMe', true);
        
                handleSubmit(onSubmit)();
    };

const handleUserLogin = async () => {
                setValue('email', 'user@admin.com');
        setValue('password', 'password123');
        setValue('rememberMe', false);
        
                handleSubmit(onSubmit)();
    };

                    const onSubmit = async (data) => {
                setError([]);
        setServerErrors({});
        setIsLoading(true);

                logger.info('=== LOGIN FORM SUBMITTED ===');
        logger.info('Validated data:', {
            email: data.email,
            rememberMe: data.rememberMe,
            rememberMeType: typeof data.rememberMe
        });

        try {
                        await authService.login(data.email, data.password, data.rememberMe);
            
                        if (authService.isAdmin()) {
                                navigate('/admin', { replace: true });
            } else {
                // Redirect user to where they came from, or their account panel
                const from = location?.state?.from?.pathname;
                navigate(from && !from.startsWith('/admin') ? from : '/account', { replace: true });
            }
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
        <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 sm:py-14">
            <div className="absolute -left-12 top-10 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="absolute -right-12 bottom-10 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />

            <div className="interactive-card relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl backdrop-blur md:grid-cols-2">
                <aside className="hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 p-10 text-white md:flex md:flex-col md:justify-between">
                    <div>
                        <p className="mb-4 inline-flex rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-100">
                            Enterprise Commerce
                        </p>
                        <h2 className="text-3xl font-bold leading-tight">Welcome back to your control hub.</h2>
                        <p className="mt-4 text-sm text-blue-100/90">
                            Track inventory, monitor orders, and scale operations from one secure workspace.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Today at a glance</p>
                            <p className="mt-2 text-sm text-blue-50">Real-time analytics, customer insights, and product visibility in one panel.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-blue-100">
                            <div className="rounded-xl border border-white/20 bg-white/10 p-3">Secure sessions</div>
                            <div className="rounded-xl border border-white/20 bg-white/10 p-3">Smart workflows</div>
                        </div>
                    </div>
                </aside>

                <section className="p-6 sm:p-8 md:p-10">
                    <div className="mb-7">
                        <h1 className="text-3xl font-bold text-slate-900">Sign in</h1>
                        <p className="mt-1 text-sm text-slate-500">Continue where you left off.</p>
                    </div>

                    <ErrorAlert
                        errors={error}
                        onClose={() => setError([])}
                        className="mb-5"
                    />

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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
                                autoComplete="current-password"
                            />
                            <FieldError error={getFieldError(errors, serverErrors, 'password')} />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <label className="flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    {...register('rememberMe')}
                                    className="cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-slate-600">
                                    Remember me
                                    {rememberMeValue && <span className="font-semibold text-emerald-600"> ✓ Enabled</span>}
                                </span>
                            </label>

                            <Link
                                to="/forgot-password"
                                className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-neo tap-bounce hover-glow w-full rounded-xl py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoading ? 'Signing in...' : 'Enter Workspace'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-600">
                            Don&apos;t have an account?{' '}
                            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                                Create one
                            </Link>
                        </p>
                    </div>

                    <>
                        <div className="glass-panel interactive-card mt-7 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 p-4">
                            <p className="mb-3 text-sm font-semibold text-indigo-900">Quick Login:</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={handleAdminLogin}
                                    disabled={isLoading}
                                    className="btn-neo tap-bounce hover-glow flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    Login as Admin
                                </button>

                                <button
                                    type="button"
                                    onClick={handleUserLogin}
                                    disabled={isLoading}
                                    className="tap-bounce hover-glow flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 font-medium text-white transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Login as User
                                </button>
                            </div>
                        </div>
                    </>
                </section>
            </div>
        </div>
    );
};

export default LoginPage;
