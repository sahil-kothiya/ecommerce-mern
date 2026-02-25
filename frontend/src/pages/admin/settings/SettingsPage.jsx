import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import notify from '../../../utils/notify';
import settingsService from '../../../services/settingsService';
import { API_CONFIG } from '../../../constants';

const urlTest = (msg) => (v) => !v || /^https?:\/\/.+/i.test(v) || msg;
const emailTest = (msg) => (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || msg;

const schema = yup.object({
    siteName: yup.string().trim().min(2, 'Site name must be at least 2 characters').required('Site name is required'),
    siteTagline: yup.string().default(''),
    siteUrl: yup.string().test('url', 'Website URL must start with http:// or https://', urlTest('Website URL must start with http:// or https://')).default(''),
    websiteEmail: yup.string().test('email', 'Invalid website email', emailTest('Invalid website email')).default(''),
    supportEmail: yup.string().test('email', 'Invalid support email', emailTest('Invalid support email')).default(''),
    phone: yup.string().test('phone', 'Invalid phone/mobile number', (v) => !v || /^[+\d\s\-()]{7,20}$/.test(v)).default(''),
    whatsapp: yup.string().default(''),
    address: yup.string().default(''),
    currencyCode: yup.string().default('USD'),
    currencySymbol: yup.string().default('$'),
    timezone: yup.string().default('UTC'),
    maintenanceMode: yup.boolean().default(false),
    metaTitle: yup.string().default(''),
    metaDescription: yup.string().default(''),
    facebook: yup.string().test('url', 'Facebook URL must start with http:// or https://', urlTest('Facebook URL must start with http:// or https://')).default(''),
    instagram: yup.string().test('url', 'Instagram URL must start with http:// or https://', urlTest('Instagram URL must start with http:// or https://')).default(''),
    twitter: yup.string().test('url', 'Twitter URL must start with http:// or https://', urlTest('Twitter URL must start with http:// or https://')).default(''),
    youtube: yup.string().test('url', 'YouTube URL must start with http:// or https://', urlTest('YouTube URL must start with http:// or https://')).default(''),
    smtpHost: yup.string().default(''),
    smtpPort: yup.number().min(1).max(65535, 'SMTP port must be between 1 and 65535').default(587),
    smtpUser: yup.string().default(''),
    smtpPassword: yup.string().default(''),
    smtpFrom: yup.string().test('email', 'Invalid SMTP from email', emailTest('Invalid SMTP from email')).default(''),
    stripePublicKey: yup.string().default(''),
    stripeSecretKey: yup.string().default(''),
    stripeWebhookSecret: yup.string().default(''),
    stripeEnabled: yup.boolean().default(false),
    paypalClientId: yup.string().default(''),
    paypalClientSecret: yup.string().default(''),
    logo: yup.mixed().nullable().default(null),
    favicon: yup.mixed().nullable().default(null),
});

const defaultValues = {
    siteName: '', siteTagline: '', siteUrl: '', websiteEmail: '', supportEmail: '',
    phone: '', whatsapp: '', address: '', currencyCode: 'USD', currencySymbol: '$',
    timezone: 'UTC', maintenanceMode: false, metaTitle: '', metaDescription: '',
    facebook: '', instagram: '', twitter: '', youtube: '',
    smtpHost: '', smtpPort: 587, smtpUser: '', smtpPassword: '', smtpFrom: '',
    stripePublicKey: '', stripeSecretKey: '', stripeWebhookSecret: '', stripeEnabled: false, paypalClientId: '', paypalClientSecret: '',
    logo: null, favicon: null,
};

const SettingsPage = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [faviconFile, setFaviconFile] = useState(null);
    const [testEmailAddress, setTestEmailAddress] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [smtpPasswordVisible, setSmtpPasswordVisible] = useState(false);
    const [stripeSecretVisible, setStripeSecretVisible] = useState(false);
    const [stripeWebhookVisible, setStripeWebhookVisible] = useState(false);
    const [webhookCopied, setWebhookCopied] = useState(false);

    const { register, handleSubmit, reset, setError, watch, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues,
        mode: 'onBlur',
    });

    const fc = (field) =>
        `w-full rounded-xl border px-4 py-3 ${errors[field] ? 'border-red-400 bg-red-50' : 'border-slate-300'}`;

    const watchLogo = watch('logo');
    const watchFavicon = watch('favicon');
    const watchMaintenance = watch('maintenanceMode');
    const watchStripeEnabled = watch('stripeEnabled');
    const watchStripePublicKey = watch('stripePublicKey');
    const watchStripeSecretKey = watch('stripeSecretKey');

    const copyWebhookUrl = () => {
        const url = `${API_CONFIG.BASE_URL}/api/payments/webhook`;
        navigator.clipboard.writeText(url).then(() => {
            setWebhookCopied(true);
            setTimeout(() => setWebhookCopied(false), 2000);
        });
    };

    const toAssetUrl = (path) => {
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        return `${API_CONFIG.BASE_URL}/uploads/${path}`;
    };

    const stats = useMemo(() => ({
        hasLogo: Boolean(watchLogo || logoFile),
        hasFavicon: Boolean(watchFavicon || faviconFile),
        maintenance: Boolean(watchMaintenance),
    }), [watchLogo, logoFile, watchFavicon, faviconFile, watchMaintenance]);

    useEffect(() => { loadSettings(); }, []);

    const loadSettings = async () => {
        try {
            setIsLoading(true);
            const response = await settingsService.getSettings();
            const settings = response?.data || {};
            reset({ ...defaultValues, ...settings });
        } catch (error) {
            notify.error(error, 'Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testEmailAddress || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmailAddress)) {
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

    const onSubmit = async (data) => {
        try {
            setIsSaving(true);
            const payload = new FormData();
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && value !== null) payload.append(key, String(value));
            });
            if (logoFile) payload.append('logo', logoFile);
            if (faviconFile) payload.append('favicon', faviconFile);

            const response = await settingsService.updateSettings(payload);
            reset({ ...defaultValues, ...(response?.data || {}) });
            setLogoFile(null);
            setFaviconFile(null);
            notify.success('Settings updated successfully');
        } catch (error) {
            if (error?.data?.errors) {
                error.data.errors.forEach(({ field, message }) => {
                    if (field) setError(field, { message });
                });
            }
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

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-black text-slate-900">Branding</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Site Name *</label>
                            <input className={fc('siteName')} {...register('siteName')} />
                            {errors.siteName && <p className="mt-1 text-sm text-red-600">{errors.siteName.message}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Site Tagline</label>
                            <input className="w-full rounded-xl border border-slate-300 px-4 py-3" {...register('siteTagline')} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Website URL</label>
                            <input className={fc('siteUrl')} {...register('siteUrl')} />
                                    {errors.siteUrl && <p className="mt-1 text-sm text-red-600">{errors.siteUrl.message}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Website Logo</label>
                            {watchLogo && <img src={toAssetUrl(String(watchLogo))} alt="Logo" className="mb-3 h-16 rounded border border-slate-200 bg-slate-50 object-contain p-1" />}
                            <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Website Favicon</label>
                            {watchFavicon && <img src={toAssetUrl(String(watchFavicon))} alt="Favicon" className="mb-3 h-12 w-12 rounded border border-slate-200 bg-slate-50 object-contain p-1" />}
                            <input type="file" accept="image/*" onChange={(e) => setFaviconFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-black text-slate-900">Contact Details</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Website Email</label>
                            <input className={fc('websiteEmail')} {...register('websiteEmail')} />
                            {errors.websiteEmail && <p className="mt-1 text-sm text-red-600">{errors.websiteEmail.message}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Support Email</label>
                            <input className={fc('supportEmail')} {...register('supportEmail')} />
                            {errors.supportEmail && <p className="mt-1 text-sm text-red-600">{errors.supportEmail.message}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Mobile Number</label>
                            <input className={fc('phone')} {...register('phone')} />
                            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">WhatsApp</label>
                            <input className="w-full rounded-xl border border-slate-300 px-4 py-3" {...register('whatsapp')} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Address</label>
                            <textarea className="w-full rounded-xl border border-slate-300 px-4 py-3" rows="3" {...register('address')} />
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-black text-slate-900">Platform and SEO</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Currency Code</label>
                            <input className="w-full rounded-xl border border-slate-300 px-4 py-3" {...register('currencyCode')} />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Currency Symbol</label>
                            <input className="w-full rounded-xl border border-slate-300 px-4 py-3" {...register('currencySymbol')} />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Timezone</label>
                            <input className="w-full rounded-xl border border-slate-300 px-4 py-3" {...register('timezone')} />
                        </div>
                        <div className="flex items-end">
                            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <input type="checkbox" {...register('maintenanceMode')} />
                                Maintenance Mode
                            </label>
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Meta Title</label>
                            <input className="w-full rounded-xl border border-slate-300 px-4 py-3" {...register('metaTitle')} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Meta Description</label>
                            <textarea className="w-full rounded-xl border border-slate-300 px-4 py-3" rows="3" {...register('metaDescription')} />
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-black text-slate-900">Social Links</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Facebook URL</label>
                            <input className={fc('facebook')} {...register('facebook')} />
                            {errors.facebook && <p className="mt-1 text-sm text-red-600">{errors.facebook.message}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Instagram URL</label>
                            <input className={fc('instagram')} {...register('instagram')} />
                            {errors.instagram && <p className="mt-1 text-sm text-red-600">{errors.instagram.message}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Twitter URL</label>
                            <input className={fc('twitter')} {...register('twitter')} />
                            {errors.twitter && <p className="mt-1 text-sm text-red-600">{errors.twitter.message}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">YouTube URL</label>
                            <input className={fc('youtube')} {...register('youtube')} />
                            {errors.youtube && <p className="mt-1 text-sm text-red-600">{errors.youtube.message}</p>}
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
                                <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" {...register('smtpHost')} placeholder="sandbox.smtp.mailtrap.io" />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">SMTP Port</label>
                                <input className={`w-full rounded-xl border bg-white px-4 py-3 ${errors.smtpPort ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} {...register('smtpPort')} placeholder="2525" />
                                {errors.smtpPort && <p className="mt-1 text-sm text-red-600">{errors.smtpPort.message}</p>}
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">SMTP Username</label>
                                <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" {...register('smtpUser')} placeholder="your-smtp-username" autoComplete="off" />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">SMTP Password</label>
                                <div className="relative">
                                    <input
                                        type={smtpPasswordVisible ? 'text' : 'password'}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11"
                                        {...register('smtpPassword')}
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
                                <input className={`w-full rounded-xl border bg-white px-4 py-3 ${errors.smtpFrom ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} {...register('smtpFrom')} placeholder="noreply@yourdomain.com" />
                                {errors.smtpFrom && <p className="mt-1 text-sm text-red-600">{errors.smtpFrom.message}</p>}
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

                        {/* ── Stripe Section ── */}
                        <div className="mb-5 rounded-xl border border-purple-200 bg-purple-50/40 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <svg className="h-4 w-4 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                                    </svg>
                                    <span className="text-sm font-bold text-purple-800">Stripe</span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${watchStripePublicKey && watchStripeSecretKey ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {watchStripePublicKey && watchStripeSecretKey ? '✓ Configured' : 'Not configured'}
                                    </span>
                                </div>
                                {/* Stripe enabled toggle */}
                                <label className="flex cursor-pointer items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-600">{watchStripeEnabled ? 'Enabled' : 'Disabled'}</span>
                                    <div className="relative">
                                        <input type="checkbox" className="sr-only" {...register('stripeEnabled')} />
                                        <div className={`h-5 w-9 rounded-full transition-colors ${watchStripeEnabled ? 'bg-purple-600' : 'bg-slate-300'}`} />
                                        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${watchStripeEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </div>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Public Key</label>
                                    <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm" {...register('stripePublicKey')} placeholder="pk_live_..." />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Secret Key</label>
                                    <div className="relative">
                                        <input
                                            type={stripeSecretVisible ? 'text' : 'password'}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm"
                                            {...register('stripeSecretKey')}
                                            placeholder="sk_live_..."
                                            autoComplete="new-password"
                                        />
                                        <button type="button" onClick={() => setStripeSecretVisible(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            {stripeSecretVisible ? '🙈' : '👁'}
                                        </button>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Webhook Secret</label>
                                    <div className="relative">
                                        <input
                                            type={stripeWebhookVisible ? 'text' : 'password'}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm"
                                            {...register('stripeWebhookSecret')}
                                            placeholder="whsec_..."
                                            autoComplete="new-password"
                                        />
                                        <button type="button" onClick={() => setStripeWebhookVisible(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            {stripeWebhookVisible ? '🙈' : '👁'}
                                        </button>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Webhook Endpoint URL</label>
                                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-purple-300 bg-white px-4 py-2.5">
                                        <code className="flex-1 truncate text-xs text-purple-700">{API_CONFIG.BASE_URL}/api/payments/webhook</code>
                                        <button type="button" onClick={copyWebhookUrl} className="shrink-0 rounded-lg bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-200">
                                            {webhookCopied ? '✓ Copied' : 'Copy'}
                                        </button>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">Paste this URL in your Stripe Dashboard → Webhooks → Add endpoint.</p>
                                </div>
                            </div>
                        </div>

                        {/* ── PayPal Section ── */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">PayPal Client ID</label>
                                <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" {...register('paypalClientId')} placeholder="AZ..." />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">PayPal Client Secret</label>
                                <input type="password" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" {...register('paypalClientSecret')} placeholder="••••••••••••" autoComplete="new-password" />
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
