import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import authService from '../../services/authService';
import { ErrorAlert, FieldError } from '../../components/common';
import { processApiError, getFieldClasses, getFieldError } from '../../utils/errorUtils';
import { useSiteSettings } from '../../context/SiteSettingsContext.jsx';
import { resolveImageUrl } from '../../utils/imageUrl';

const resetPasswordSchema = yup.object().shape({
    token: yup
        .string()
        .required('Reset token is required')
        .trim(),
    newPassword: yup
        .string()
        .required('New password is required')
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters'),
    confirmPassword: yup
        .string()
        .required('Please confirm your new password')
        .trim()
        .test('passwords-match', 'Passwords must match', function (value) {
            return this.parent.newPassword === value;
        }),
});

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const { settings } = useSiteSettings();
    const [searchParams] = useSearchParams();
    const initialToken = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState([]);
    const [isCompleted, setIsCompleted] = useState(false);
    const siteName = String(settings?.siteName || 'Enterprise E-Commerce').trim();
    const logoUrl = resolveImageUrl(settings?.logo, { placeholder: null });

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(resetPasswordSchema),
        mode: 'onBlur',
        defaultValues: {
            token: initialToken,
            newPassword: '',
            confirmPassword: '',
        },
    });

                const onSubmit = async (data) => {
        setError([]);
        setIsLoading(true);

        try {
            await authService.resetPassword(data.token.trim(), data.newPassword.trim());
            setIsCompleted(true);
            toast.success('Password reset successfully. You can now sign in.');
        } catch (err) {
            const { errorMessages, generalError } = processApiError(err);
            setError(errorMessages.length > 0 ? errorMessages : [generalError]);
        } finally {
            setIsLoading(false);
        }
    };

                return (
                    <div className="relative min-h-screen overflow-hidden bg-slate-950 p-4">
                        <div className="absolute -left-10 top-10 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
                        <div className="absolute -right-10 bottom-10 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl" />
                        <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center py-8">
                            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
                
                <div className="text-center mb-6">
                    {logoUrl && (
                        <img src={logoUrl} alt={siteName} className="mx-auto mb-3 h-10 w-10 rounded-lg object-cover" />
                    )}
                    <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
                        <svg className="h-7 w-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="mb-1 text-3xl font-bold text-gray-900">Reset Password</h1>
                    <p className="text-sm text-gray-500">Create a new password for your account.</p>
                </div>

{isCompleted ? (
                    <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
                        <div className="flex items-start gap-2">
                            <svg className="mt-0.5 h-5 w-5 shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1">
                                <p className="mb-2 text-sm font-semibold text-green-700">
                                    Your password has been reset successfully.
                                </p>
                                <Link
                                    to="/login"
                                    className="inline-flex items-center text-sm font-medium text-green-700 underline hover:text-green-800"
                                >
                                    Sign in with new password →
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                            
                            <ErrorAlert
                                errors={error}
                                onClose={() => setError([])}
                                className="mb-1"
                            />

{!initialToken && (
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Reset Token
                                    </label>
                                    <input
                                        type="text"
                                        {...register('token')}
                                        className={getFieldClasses(errors, {}, 'token')}
                                        placeholder="Paste reset token here"
                                        autoComplete="off"
                                    />
                                    <FieldError error={getFieldError(errors, {}, 'token')} />
                                </div>
                            )}

                            <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    {...register('newPassword')}
                                    className={getFieldClasses(errors, {}, 'newPassword')}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                                <FieldError error={getFieldError(errors, {}, 'newPassword')} />
                                {!getFieldError(errors, {}, 'newPassword') && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Must be between 8 and 128 characters
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    {...register('confirmPassword')}
                                    className={getFieldClasses(errors, {}, 'confirmPassword')}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                                <FieldError error={getFieldError(errors, {}, 'confirmPassword')} />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isLoading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    </>
                )}

<div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Back to{' '}
                        <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
