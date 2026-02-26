import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../../services/apiClient';
import { API_CONFIG } from '../../constants';
import notify from '../../utils/notify';

const addressSchema = yup.object({
    label: yup.string().default(''),
    firstName: yup.string().trim().required('First name is required'),
    lastName: yup.string().trim().required('Last name is required'),
    phone: yup.string().trim().required('Phone is required'),
    address1: yup.string().trim().required('Address line 1 is required'),
    address2: yup.string().default(''),
    city: yup.string().trim().required('City is required'),
    state: yup.string().default(''),
    postCode: yup.string().trim().required('Post code is required'),
    country: yup.string().trim().required('Country is required'),
    isDefault: yup.boolean().default(false),
});

const defaultValues = {
    label: '', firstName: '', lastName: '', phone: '',
    address1: '', address2: '', city: '', state: '',
    postCode: '', country: '', isDefault: false,
};

const AccountAddresses = () => {
    const [addresses, setAddresses] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const { register, handleSubmit, reset, setError, formState: { errors } } = useForm({
        resolver: yupResolver(addressSchema),
        defaultValues,
        mode: 'onBlur',
    });

    const fc = (field) => `w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${errors[field] ? 'border-red-400 focus:ring-red-100 bg-red-50' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`;

    useEffect(() => {
        const load = async () => {
            try {
                const data = await apiClient.get(`${API_CONFIG.ENDPOINTS.AUTH}/me`);
                const payload = data?.data?.user || data?.user || {};
                setAddresses(Array.isArray(payload?.data?.user?.addresses) ? payload.data.user.addresses : []);
            } catch {
                notify.error('Failed to load addresses');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const resetForm = () => {
        reset(defaultValues);
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (addr) => {
        reset({
            label: addr.label || '',
            firstName: addr.firstName || '',
            lastName: addr.lastName || '',
            phone: addr.phone || '',
            address1: addr.address1 || '',
            address2: addr.address2 || '',
            city: addr.city || '',
            state: addr.state || '',
            postCode: addr.postCode || '',
            country: addr.country || '',
            isDefault: Boolean(addr.isDefault),
        });
        setEditingId(addr._id);
        setShowForm(true);
    };

    const onSubmit = async (data) => {
        try {
            setIsSaving(true);
            const result = editingId
                ? await apiClient.put(`${API_CONFIG.ENDPOINTS.AUTH}/addresses/${editingId}`, data)
                : await apiClient.post(`${API_CONFIG.ENDPOINTS.AUTH}/addresses`, data);
            setAddresses(result?.data?.addresses || result?.addresses || []);
            notify.success(`Address ${editingId ? 'updated' : 'added'} successfully`);
            resetForm();
        } catch (err) {
            const serverErrors = err?.errors || err?.data?.errors;
            if (Array.isArray(serverErrors)) {
                serverErrors.forEach(({ field, message }) => { if (field) setError(field, { message }); });
                notify.error('Please fix form validation errors');
            } else {
                notify.error(err.message || 'Failed to save address');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (addrId) => {
        if (!window.confirm('Remove this address?')) return;
        try {
            const data = await apiClient.delete(`${API_CONFIG.ENDPOINTS.AUTH}/addresses/${addrId}`);
            setAddresses(data?.data?.addresses || data?.addresses || []);
            if (editingId === addrId) resetForm();
            notify.success('Address removed');
        } catch (err) {
            notify.error(err.message || 'Failed to delete address');
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Manage Addresses</h1>
                    <p className="text-sm text-slate-500">{addresses.length} saved address{addresses.length !== 1 ? 'es' : ''}</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        + Add New Address
                    </button>
                )}
            </div>

            {/* Address Form */}
            {showForm && (
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-blue-100">
                    <h2 className="mb-4 text-base font-bold text-slate-800">{editingId ? 'Edit Address' : 'New Address'}</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Label (e.g. Home, Office)</label>
                            <input {...register('label')} placeholder="Home" className={fc('label')} />
                            {errors.label && <p className="mt-1 text-sm text-red-600">{errors.label.message}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">First Name <span className="text-red-500">*</span></label>
                            <input {...register('firstName')} placeholder="John" className={fc('firstName')} />
                            {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Last Name <span className="text-red-500">*</span></label>
                            <input {...register('lastName')} placeholder="Doe" className={fc('lastName')} />
                            {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Phone <span className="text-red-500">*</span></label>
                            <input {...register('phone')} placeholder="+1 555 000 0000" className={fc('phone')} />
                            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Address Line 1 <span className="text-red-500">*</span></label>
                            <input {...register('address1')} placeholder="123 Main St" className={fc('address1')} />
                            {errors.address1 && <p className="mt-1 text-sm text-red-600">{errors.address1.message}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Address Line 2</label>
                            <input {...register('address2')} placeholder="Apt, Suite, etc." className={fc('address2')} />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">City <span className="text-red-500">*</span></label>
                            <input {...register('city')} placeholder="New York" className={fc('city')} />
                            {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">State / Province</label>
                            <input {...register('state')} placeholder="NY" className={fc('state')} />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Post Code <span className="text-red-500">*</span></label>
                            <input {...register('postCode')} placeholder="10001" className={fc('postCode')} />
                            {errors.postCode && <p className="mt-1 text-sm text-red-600">{errors.postCode.message}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Country <span className="text-red-500">*</span></label>
                            <input {...register('country')} placeholder="United States" className={fc('country')} />
                            {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                                <input type="checkbox" {...register('isDefault')} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                                <span className="font-medium">Set as default delivery address</span>
                            </label>
                        </div>
                    </div>
                    <div className="mt-5 flex gap-2">
                        <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                            {isSaving ? 'Saving...' : editingId ? 'Update Address' : 'Add Address'}
                        </button>
                        <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Address List */}
            {addresses.length === 0 && !showForm ? (
                <div className="rounded-2xl bg-white py-14 text-center shadow-sm ring-1 ring-slate-100">
                    <svg className="mx-auto mb-4 h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                    <p className="text-slate-500">No saved addresses yet.</p>
                    <button onClick={() => setShowForm(true)} className="mt-3 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">Add Your First Address</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {addresses.map((addr) => (
                        <div key={addr._id} className={`rounded-2xl bg-white p-5 shadow-sm ring-1 transition ${addr.isDefault ? 'ring-blue-300' : 'ring-slate-100'}`}>
                            <div className="mb-3 flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    {addr.label && (
                                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{addr.label}</span>
                                    )}
                                    {addr.isDefault && (
                                        <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Default</span>
                                    )}
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => handleEdit(addr)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100">Edit</button>
                                    <button onClick={() => handleDelete(addr._id)} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50">Delete</button>
                                </div>
                            </div>
                            <p className="font-semibold text-slate-800">{[addr.firstName, addr.lastName].filter(Boolean).join(' ')}</p>
                            <p className="mt-0.5 text-sm text-slate-500">{addr.phone}</p>
                            <p className="mt-1 text-sm text-slate-600">
                                {[addr.address1, addr.address2].filter(Boolean).join(', ')}
                            </p>
                            <p className="text-sm text-slate-600">
                                {[addr.city, addr.state, addr.postCode].filter(Boolean).join(', ')}
                            </p>
                            <p className="text-sm text-slate-600">{addr.country}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AccountAddresses;
