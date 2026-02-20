import React, { useEffect, useMemo, useState } from 'react';
import notify from '../../../utils/notify';
import settingsService from '../../../services/settingsService';
import { API_CONFIG } from '../../../constants';
import { clearFieldError, getFieldBorderClass, mapServerFieldErrors } from '../../../utils/formValidation';

const defaultState = {
    siteName: '',
    siteTagline: '',
    siteUrl: '',
    websiteEmail: '',
    supportEmail: '',
    phone: '',
    whatsapp: '',
    address: '',
    currencyCode: 'USD',
    currencySymbol: '$',
    timezone: 'UTC',
    maintenanceMode: false,
    metaTitle: '',
    metaDescription: '',
    facebook: '',
    instagram: '',
    twitter: '',
    youtube: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpFrom: '',
    stripePublicKey: '',
    stripeSecretKey: '',
    paypalClientId: '',
    paypalClientSecret: '',
    logo: null,
    favicon: null,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlPattern = /^https?:\/\/.+/i;
const phonePattern = /^[+\d\s\-()]{7,20}$/;

const SettingsPage = () => {
    const [formData, setFormData] = useState(defaultState);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [faviconFile, setFaviconFile] = useState(null);
    const [testEmailAddress, setTestEmailAddress] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [smtpPasswordVisible, setSmtpPasswordVisible] = useState(false);

    const toAssetUrl = (path) => {
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        return `${API_CONFIG.BASE_URL}/uploads/${path}`;
    };

    const stats = useMemo(() => ({
        hasLogo: Boolean(formData.logo || logoFile),
        hasFavicon: Boolean(formData.favicon || faviconFile),
        maintenance: Boolean(formData.maintenanceMode),
    }), [formData.logo, logoFile, formData.favicon, faviconFile, formData.maintenanceMode]);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setIsLoading(true);
            const response = await settingsService.getSettings();
            const settings = response?.data || {};
            setFormData((prev) => ({ ...prev, ...settings }));
            setErrors({});
        } catch (error) {
            notify.error(error, 'Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        clearFieldError(setErrors, name);
    };

    const validate = () => {
        const nextErrors = {};
        const trimmedName = String(formData.siteName || '').trim();

        if (trimmedName.length < 2) nextErrors.siteName = 'Site name must be at least 2 characters';
        if (formData.websiteEmail && !emailPattern.test(formData.websiteEmail)) nextErrors.websiteEmail = 'Invalid website email';
        if (formData.supportEmail && !emailPattern.test(formData.supportEmail)) nextErrors.supportEmail = 'Invalid support email';
        if (formData.smtpFrom && !emailPattern.test(formData.smtpFrom)) nextErrors.smtpFrom = 'Invalid SMTP from email';
        if (formData.siteUrl && !urlPattern.test(formData.siteUrl)) nextErrors.siteUrl = 'Website URL must start with http:// or https://';
        if (formData.facebook && !urlPattern.test(formData.facebook)) nextErrors.facebook = 'Facebook URL must start with http:// or https://';
        if (formData.instagram && !urlPattern.test(formData.instagram)) nextErrors.instagram = 'Instagram URL must start with http:// or https://';
        if (formData.twitter && !urlPattern.test(formData.twitter)) nextErrors.twitter = 'Twitter URL must start with http:// or https://';
        if (formData.youtube && !urlPattern.test(formData.youtube)) nextErrors.youtube = 'YouTube URL must start with http:// or https://';
        if (formData.phone && !phonePattern.test(formData.phone)) nextErrors.phone = 'Invalid phone/mobile number';

        const smtpPort = Number(formData.smtpPort);
        if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
            nextErrors.smtpPort = 'SMTP port must be between 1 and 65535';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleTestEmail = async () => {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!testEmailAddress || !emailPattern.test(testEmailAddress)) {
            notify.error('Enter a valid email address to send the test to');
            return;
        }
        try {
            setIsSendingTest(true);
            await settingsService.testEmail(testEmailAddress);
            notify.success(`Test email sent to ${testEmailAddress}`);
        } catch (error) {
            notify.error(error, 'Failed to send test email');
        } finally {
            setIsSendingTest(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!validate()) {
            notify.error('Please fix form validation errors');
            return;
        }

        try {
            setIsSaving(true);
            const payload = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== undefined && value !== null) payload.append(key, String(value));
            });

            if (logoFile) payload.append('logo', logoFile);
            if (faviconFile) payload.append('favicon', faviconFile);

            const response = await settingsService.updateSettings(payload);
            setFormData((prev) => ({ ...prev, ...(response?.data || {}) }));
            setLogoFile(null);
            setFaviconFile(null);
            setErrors({});
            notify.success('Settings updated successfully');
        } catch (error) {
            const mapped = mapServerFieldErrors(error?.data?.errors);
            if (Object.keys(mapped).length > 0) setErrors((prev) => ({ ...prev, ...mapped }));
            notify.error(error, 'Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading settings workspace...</p>
                    <p className="mt-1 text-sm text-slate-500">Preparing branding and credentials</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-lg sm:p-8">
                <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-blue-300/20 blur-3xl" />
                <div className="relative">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Admin Console</p>
                    <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Settings</h1>
                    <p className="mt-2 max-w-3xl text-slate-200/90">
                        Manage website logo, emails, phone numbers, social links, metadata, SMTP and payment credentials.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Logo</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{stats.hasLogo ? 'Configured' : 'Missing'}</p>
                </div>
                <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-cyan-700">Favicon</p>
                    <p className="mt-2 text-2xl font-black text-cyan-800">{stats.hasFavicon ? 'Configured' : 'Missing'}</p>
                </div>
                <div className={`rounded-2xl border p-5 shadow-sm ${stats.maintenance ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white' : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'}`}>
                    <p className={`text-xs uppercase tracking-widest ${stats.maintenance ? 'text-amber-700' : 'text-emerald-700'}`}>Mode</p>
                    <p className={`mt-2 text-2xl font-black ${stats.maintenance ? 'text-amber-800' : 'text-emerald-800'}`}>{stats.maintenance ? 'Maintenance' : 'Live'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-black text-slate-900">Branding</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Site Name *</label>
                            <input className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'siteName')}`} name="siteName" value={formData.siteName || ''} onChange={handleChange} />
                            {errors.siteName && <p className="mt-1 text-sm text-red-600">{errors.siteName}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Site Tagline</label>
                            <input className="w-full rounded-xl border border-slate-300 px-4 py-3" name="siteTagline" value={formData.siteTagline || ''} onChange={handleChange} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Website URL</label>
                            <input className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'siteUrl')}`} name="siteUrl" value={formData.siteUrl || ''} onChange={handleChange} />
                            {errors.siteUrl && <p className="mt-1 text-sm text-red-600">{errors.siteUrl}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Website Logo</label>
                            {formData.logo && <img src={toAssetUrl(formData.logo)} alt="Logo" className="mb-3 h-16 rounded border border-slate-200 bg-slate-50 object-contain p-1" />}
                            <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Website Favicon</label>
                            {formData.favicon && <img src={toAssetUrl(formData.favicon)} alt="Favicon" className="mb-3 h-12 w-12 rounded border border-slate-200 bg-slate-50 object-contain p-1" />}
                            <input type="file" accept="image/*" onChange={(e) => setFaviconFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-black text-slate-900">Contact Details</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Website Email</label>
                            <input className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'websiteEmail')}`} name="websiteEmail" value={formData.websiteEmail || ''} onChange={handleChange} />
                            {errors.websiteEmail && <p className="mt-1 text-sm text-red-600">{errors.websiteEmail}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Support Email</label>
                            <input className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'supportEmail')}`} name="supportEmail" value={formData.supportEmail || ''} onChange={handleChange} />
                            {errors.supportEmail && <p className="mt-1 text-sm text-red-600">{errors.supportEmail}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Mobile Number</label>
                            <input className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'phone')}`} name="phone" value={formData.phone || ''} onChange={handleChange} />
                            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">WhatsApp</label>
                            <input className="w-full rounded-xl border border-slate-300 px-4 py-3" name="whatsapp" value={formData.whatsapp || ''} onChange={handleChange} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Address</label>
                            <textarea className="w-full rounded-xl border border-slate-300 px-4 py-3" rows="3" name="address" value={formData.address || ''} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-black text-slate-900">Platform and SEO</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Currency Code</label>
                            <input className="w-full rounded-xl border border-slate-300 px-4 py-3" name="currencyCode" value={formData.currencyCode || ''} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Currency Symbol</label>
                            <input className="w-full rounded-xl border border-slate-300 px-4 py-3" name="currencySymbol" value={formData.currencySymbol || ''} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Timezone</label>
                            <input className="w-full rounded-xl border border-slate-300 px-4 py-3" name="timezone" value={formData.timezone || ''} onChange={handleChange} />
                        </div>
                        <div className="flex items-end">
                            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <input type="checkbox" name="maintenanceMode" checked={Boolean(formData.maintenanceMode)} onChange={handleChange} />
                                Maintenance Mode
                            </label>
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Meta Title</label>
                            <input className="w-full rounded-xl border border-slate-300 px-4 py-3" name="metaTitle" value={formData.metaTitle || ''} onChange={handleChange} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Meta Description</label>
                            <textarea className="w-full rounded-xl border border-slate-300 px-4 py-3" rows="3" name="metaDescription" value={formData.metaDescription || ''} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-black text-slate-900">Social Links</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Facebook URL</label>
                            <input className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'facebook')}`} name="facebook" value={formData.facebook || ''} onChange={handleChange} />
                            {errors.facebook && <p className="mt-1 text-sm text-red-600">{errors.facebook}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Instagram URL</label>
                            <input className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'instagram')}`} name="instagram" value={formData.instagram || ''} onChange={handleChange} />
                            {errors.instagram && <p className="mt-1 text-sm text-red-600">{errors.instagram}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Twitter URL</label>
                            <input className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'twitter')}`} name="twitter" value={formData.twitter || ''} onChange={handleChange} />
                            {errors.twitter && <p className="mt-1 text-sm text-red-600">{errors.twitter}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">YouTube URL</label>
                            <input className={`w-full rounded-xl border px-4 py-3 ${getFieldBorderClass(errors, 'youtube')}`} name="youtube" value={formData.youtube || ''} onChange={handleChange} />
                            {errors.youtube && <p className="mt-1 text-sm text-red-600">{errors.youtube}</p>}
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-1 text-xl font-black text-slate-900">Credentials</h2>
                    <p className="mb-6 text-sm text-slate-500">SMTP and payment gateway configuration. Changes take effect immediately.</p>

                    <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <h3 className="text-base font-bold text-slate-800">SMTP Email Configuration</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">SMTP Host</label>
                                <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" name="smtpHost" value={formData.smtpHost || ''} onChange={handleChange} placeholder="sandbox.smtp.mailtrap.io" />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">SMTP Port</label>
                                <input className={`w-full rounded-xl border bg-white px-4 py-3 ${getFieldBorderClass(errors, 'smtpPort')}`} name="smtpPort" value={formData.smtpPort || ''} onChange={handleChange} placeholder="2525" />
                                {errors.smtpPort && <p className="mt-1 text-sm text-red-600">{errors.smtpPort}</p>}
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">SMTP Username</label>
                                <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" name="smtpUser" value={formData.smtpUser || ''} onChange={handleChange} placeholder="your-smtp-username" autoComplete="off" />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">SMTP Password</label>
                                <div className="relative">
                                    <input
                                        type={smtpPasswordVisible ? 'text' : 'password'}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11"
                                        name="smtpPassword"
                                        value={formData.smtpPassword || ''}
                                        onChange={handleChange}
                                        placeholder="••••••••••••"
                                        autoComplete="new-password"
                                    />
                                    <button type="button" onClick={() => setSmtpPasswordVisible((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {smtpPasswordVisible
                                            ? <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                            : <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        }
                                    </button>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-semibold text-slate-700">From Email Address</label>
                                <input className={`w-full rounded-xl border bg-white px-4 py-3 ${getFieldBorderClass(errors, 'smtpFrom')}`} name="smtpFrom" value={formData.smtpFrom || ''} onChange={handleChange} placeholder="noreply@yourdomain.com" />
                                {errors.smtpFrom && <p className="mt-1 text-sm text-red-600">{errors.smtpFrom}</p>}
                            </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
                            <p className="mb-3 text-sm font-semibold text-slate-700">Send Test Email</p>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                    type="email"
                                    className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                                    placeholder="recipient@example.com"
                                    value={testEmailAddress}
                                    onChange={(e) => setTestEmailAddress(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={handleTestEmail}
                                    disabled={isSendingTest}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isSendingTest ? (
                                        <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Sending...</>
                                    ) : (
                                        <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> Send Test</>
                                    )}
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-slate-400">Save settings first, then send a test to confirm SMTP is working.</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <h3 className="text-base font-bold text-slate-800">Payment Gateway</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Stripe Public Key</label>
                                <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" name="stripePublicKey" value={formData.stripePublicKey || ''} onChange={handleChange} placeholder="pk_live_..." />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Stripe Secret Key</label>
                                <input type="password" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" name="stripeSecretKey" value={formData.stripeSecretKey || ''} onChange={handleChange} placeholder="sk_live_..." autoComplete="new-password" />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">PayPal Client ID</label>
                                <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" name="paypalClientId" value={formData.paypalClientId || ''} onChange={handleChange} placeholder="AZ..." />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">PayPal Client Secret</label>
                                <input type="password" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" name="paypalClientSecret" value={formData.paypalClientSecret || ''} onChange={handleChange} placeholder="••••••••••••" autoComplete="new-password" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-3 z-10 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row">
                    <button type="button" onClick={loadSettings} className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition-colors hover:bg-slate-100 sm:w-auto">
                        Reset
                    </button>
                    <button type="submit" disabled={isSaving} className="w-full rounded-xl bg-indigo-400 px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-indigo-300 disabled:opacity-50 sm:flex-1">
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsPage;
