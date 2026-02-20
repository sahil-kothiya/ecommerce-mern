import React from 'react';

export const AdminLoadingState = ({
    title = 'Loading...',
    subtitle = 'Preparing your workspace',
}) => {
    return (
        <div className="flex h-[420px] items-center justify-center">
            <div className="admin-surface w-full max-w-md rounded-3xl p-10 text-center">
                <div className="mx-auto mb-5 h-16 w-16 animate-spin rounded-full border-[3px] border-[#d2dff9] border-t-[#f9730c] shadow-[0_0_0_4px_rgba(165,187,252,0.2)]" />
                <p className="text-lg font-semibold text-[#212191]">{title}</p>
                <p className="mt-1 text-sm text-[#666666]">{subtitle}</p>
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
        <div className="admin-hero rounded-3xl p-6 text-white sm:p-8">
            <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-[#ffa336]/30 blur-3xl" />
            <div className="absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-[#a5bbfc]/30 blur-3xl" />
            <div className="absolute bottom-4 right-28 h-24 w-24 rounded-full bg-pink-400/20 blur-2xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="admin-hero-eyebrow text-xs uppercase">{eyebrow}</p>
                    <h1 className="admin-display mt-2 text-3xl leading-tight sm:text-4xl">{title}</h1>
                    {subtitle ? <p className="mt-2 text-[#e8effc]">{subtitle}</p> : null}
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
        <div className={`admin-surface rounded-2xl p-6 ${className}`}>
            {children}
        </div>
    );
};
