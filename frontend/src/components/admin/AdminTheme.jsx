import React from 'react';

export const AdminLoadingState = ({
    title = 'Loading...',
    subtitle = 'Preparing your workspace',
}) => {
    return (
        <div className="flex h-[420px] items-center justify-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                <p className="text-lg font-semibold text-slate-800">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
        </div>
    );
};

export const AdminPageHeader = ({
    eyebrow = 'Admin Console',
    title,
    subtitle,
    actions = null,
    badge = null,
}) => {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-lg sm:p-8">
            <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">{eyebrow}</p>
                    <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{title}</h1>
                    {subtitle ? <p className="mt-2 text-slate-200/90">{subtitle}</p> : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {badge}
                    {actions}
                </div>
            </div>
        </div>
    );
};

export const AdminSurface = ({ children, className = '' }) => {
    return (
        <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
            {children}
        </div>
    );
};
