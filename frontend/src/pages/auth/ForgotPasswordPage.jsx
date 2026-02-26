import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import authService from '../../services/authService';
import { ErrorAlert, FieldError } from '../../components/common';
import { processApiError, getFieldClasses, getFieldError } from '../../utils/errorUtils';
import { useSiteSettings } from '../../context/useSiteSettings';
import { resolveImageUrl } from '../../utils/imageUrl';

const forgotPasswordSchema = yup.object().shape({
    email: yup
        .string()
        .required('Email is required')
        .email('Please enter a valid email address')
        .trim(),
});

const ForgotPasswordPage = () => {
    const { settings } = useSiteSettings();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState([]);
    const [submitted, setSubmitted] = useState(false);
    const siteName = String(settings?.siteName || 'Enterprise E-Commerce').trim();
    const logoUrl = resolveImageUrl(settings?.logo, { placeholder: null });

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(forgotPasswordSchema),
        mode: 'onBlur',
        defaultValues: { email: '' },
    });

                const onSubmit = async (data) => {
        setError([]);
        setIsLoading(true);

        try {
            await authService.forgotPassword(data.email.trim().toLowerCase());
            setSubmitted(true);
            toast.success('If an account exists, a reset link has been sent.');
        } catch (err) {
            const { errorMessages, generalError } = processApiError(err);
            setError(errorMessages.length > 0 ? errorMessages : [generalError]);
        } finally {
            setIsLoading(false);
        }
    };

                return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 sm:py-14">
            <div className="absolute -left-10 top-16 h-56 w-56 rounded-full bg-amber-500/20 blur-3xl" />
            <div className="absolute -right-10 bottom-8 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />

            <div className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl backdrop-blur md:grid-cols-2">
                <aside className="hidden bg-gradient-to-br from-slate-900 via-sky-900 to-cyan-900 p-10 text-white md:flex md:flex-col md:justify-between">
                    <div>
                        <p className="mb-4 inline-flex rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-100">
                            Account Recovery
                        </p>
                        <h2 className="text-3xl font-bold leading-tight">Let&apos;s get you back in securely.</h2>
                        <p className="mt-4 text-sm text-cyan-100/90">
                            We&apos;ll send a recovery link to your registered email so you can reset access safely.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-cyan-50">
                        Security note: if the email exists, reset instructions arrive in moments.
                    </div>
                </aside>

                <section className="p-6 sm:p-8 md:p-10">
                    <div className="mb-6 text-center md:text-left">
                        {logoUrl && (
                            <img src={logoUrl} alt={siteName} className="mb-3 h-10 w-10 rounded-lg object-cover" />
                        )}
                        <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100">
                            <svg className="h-7 w-7 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">Forgot Password</h1>
                        <p className="mt-1 text-sm text-slate-500">Enter your email and we&apos;ll send a reset link.</p>
                    </div>

                    {submitted ? (
                        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex items-start gap-2">
                                <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                    <p className="mb-2 text-sm font-semibold text-emerald-700">
                                        Request submitted! Check your inbox if the account exists.
                                    </p>
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center text-sm font-medium text-emerald-700 underline hover:text-emerald-800"
                                    >
                                        Back to Sign In →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                            <ErrorAlert
                                errors={error}
                                onClose={() => setError([])}
                                className="mb-1"
                            />

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
                                <input
                                    type="email"
                                    {...register('email')}
                                    className={getFieldClasses(errors, {}, 'email')}
                                    placeholder="your@email.com"
                                    autoComplete="email"
                                />
                                <FieldError error={getFieldError(errors, {}, 'email')} />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center md:text-left">
                        <p className="text-sm text-slate-600">
                            Remembered your password?{' '}
                            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
