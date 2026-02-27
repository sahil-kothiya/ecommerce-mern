import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import authService from '../../services/authService';
import apiClient from '../../services/apiClient';
import { API_CONFIG } from '../../constants';
import notify from '../../utils/notify';

const profileSchema = yup.object({
    name: yup.string().trim().required('Full name is required.').min(2, 'Name must be at least 2 characters.'),
    email: yup.string().trim().required('Email address is required.').email('Please enter a valid email address.'),
    phone: yup.string().trim().test('phone-min', 'Phone must be at least 7 characters.', (v) => !v || v.length >= 7),
});

const passwordSchema = yup.object({
    currentPassword: yup.string().required('Current password is required.'),
    newPassword: yup
        .string()
        .required('New password is required.')
        .min(8, 'Password must be at least 8 characters.')
        .max(128, 'Password must be at most 128 characters.'),
    confirmPassword: yup
        .string()
        .required('Please confirm your new password.')
        .oneOf([yup.ref('newPassword')], 'Passwords do not match.'),
});

const FieldError = ({ msg }) => msg ? <p className="mt-1 text-xs text-red-600">{msg}</p> : null;

const inputClass = (hasError) =>
    `w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 ${
        hasError
            ? 'border-red-400 focus:border-red-400 focus:ring-red-100 bg-red-50'
            : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'
    }`;

const AccountProfile = () => {
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [activeSection, setActiveSection] = useState('info');

    const {
        register: regProfile,
        handleSubmit: handleProfileSubmit,
        formState: { errors: profileErrors },
        reset: resetProfile,
        setError: setProfileError,
    } = useForm({ resolver: yupResolver(profileSchema), mode: 'onBlur' });

    const {
        register: regPassword,
        handleSubmit: handlePasswordSubmit,
        formState: { errors: passwordErrors },
        reset: resetPassword,
        setError: setPasswordError,
    } = useForm({ resolver: yupResolver(passwordSchema), mode: 'onBlur' });

    useEffect(() => {
        const load = async () => {
            try {
                const data = await apiClient.get(`${API_CONFIG.ENDPOINTS.AUTH}/me`);
                const profile = data?.data?.user || data?.user || null;
                if (profile) {
                    resetProfile({ name: profile.name || '', email: profile.email || '', phone: profile.phone || '' });
                }
            } catch {
                notify.error('Failed to load profile.');
            } finally {
                setIsLoadingProfile(false);
            }
        };
        load();
    }, [resetProfile]);

    const onProfileSave = async (data) => {
        try {
            setIsSavingProfile(true);
            const result = await apiClient.put(`${API_CONFIG.ENDPOINTS.AUTH}/profile`, {
                name: data.name, 
                email: data.email, 
                phone: data.phone 
            });
            const updatedUser = result?.data?.user || result?.user;
            if (updatedUser) {
                authService.setUser(updatedUser);
                resetProfile({ name: updatedUser.name || '', email: updatedUser.email || '', phone: updatedUser.phone || '' });
            }
            notify.success('Profile updated successfully.');
        } catch (err) {
            if (err.data?.errors) {
                err.data.errors.forEach(({ field, message }) => {
                    if (field) setProfileError(field, { message });
                });
                return;
            }
            notify.error(err.message || 'Failed to update profile');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const onPasswordSave = async (data) => {
        try {
            setIsSavingPassword(true);
            await apiClient.put(`${API_CONFIG.ENDPOINTS.AUTH}/change-password`, {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
                confirmPassword: data.confirmPassword,
            });
            notify.success('Password changed successfully.');
            resetPassword();
        } catch (err) {
            if (err.data?.errors) {
                err.data.errors.forEach(({ field, message }) => {
                    if (field) setPasswordError(field, { message });
                });
                return;
            }
            notify.error(err.message || 'Failed to change password');
        } finally {
            setIsSavingPassword(false);
        }
    };

    if (isLoadingProfile) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-slate-800">Profile & Security</h1>
                <p className="text-sm text-slate-500">Manage your personal info and password.</p>
            </div>

            {/* Section tabs */}
            <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
                {[{ key: 'info', label: 'Personal Info' }, { key: 'password', label: 'Change Password' }].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveSection(tab.key)}
                        className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${activeSection === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Personal info form ───────────────────────────────────────── */}
            {activeSection === 'info' && (
                <form onSubmit={handleProfileSubmit(onProfileSave)} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100" noValidate>
                    <h2 className="mb-5 text-base font-bold text-slate-800">Personal Information</h2>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...regProfile('name')}
                                type="text"
                                className={inputClass(!!profileErrors.name)}
                                placeholder="Your full name"
                            />
                            <FieldError msg={profileErrors.name?.message} />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...regProfile('email')}
                                type="email"
                                className={inputClass(!!profileErrors.email)}
                                placeholder="your@email.com"
                            />
                            <FieldError msg={profileErrors.email?.message} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Mobile Number</label>
                            <input
                                {...regProfile('phone')}
                                type="text"
                                className={inputClass(!!profileErrors.phone)}
                                placeholder="+1 (555) 000-0000"
                            />
                            <FieldError msg={profileErrors.phone?.message} />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="mt-5 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSavingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            )}

            {/* ── Change password form ─────────────────────────────────────── */}
            {activeSection === 'password' && (
                <form onSubmit={handlePasswordSubmit(onPasswordSave)} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100" noValidate>
                    <h2 className="mb-5 text-base font-bold text-slate-800">Change Password</h2>

                    <div className="space-y-5">
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Current Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...regPassword('currentPassword')}
                                type="password"
                                className={inputClass(!!passwordErrors.currentPassword)}
                                placeholder="Enter your current password"
                                autoComplete="current-password"
                            />
                            <FieldError msg={passwordErrors.currentPassword?.message} />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                New Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...regPassword('newPassword')}
                                type="password"
                                className={inputClass(!!passwordErrors.newPassword)}
                                placeholder="Minimum 8 characters"
                                autoComplete="new-password"
                            />
                            <FieldError msg={passwordErrors.newPassword?.message} />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Confirm New Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...regPassword('confirmPassword')}
                                type="password"
                                className={inputClass(!!passwordErrors.confirmPassword)}
                                placeholder="Re-enter new password"
                                autoComplete="new-password"
                            />
                            <FieldError msg={passwordErrors.confirmPassword?.message} />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSavingPassword}
                        className="mt-5 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSavingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default AccountProfile;
