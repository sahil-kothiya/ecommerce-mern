import { forwardRef } from 'react';

const variants = {
    primary: 'bg-primary-600 text-white border-transparent hover:bg-primary-700 focus-visible:ring-primary-500/30 shadow-sm hover:shadow-md',
    secondary: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-500/20',
    outline: 'bg-transparent text-primary-600 border-primary-300 hover:bg-primary-50 hover:border-primary-400 focus-visible:ring-primary-500/20',
    ghost: 'bg-transparent text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-500/20',
    danger: 'bg-red-600 text-white border-transparent hover:bg-red-700 focus-visible:ring-red-500/30 shadow-sm',
    success: 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700 focus-visible:ring-emerald-500/30 shadow-sm',
};

const sizes = {
    xs: 'px-2.5 py-1 text-xs gap-1 rounded-md',
    sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-lg',
    md: 'px-4 py-2 text-sm gap-2 rounded-lg',
    lg: 'px-5 py-2.5 text-base gap-2 rounded-xl',
    xl: 'px-6 py-3 text-base gap-2.5 rounded-xl',
};

const Button = forwardRef(({
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    loading = false,
    disabled = false,
    fullWidth = false,
    className = '',
    ...props
}, ref) => {
    const isDisabled = disabled || loading;

    return (
        <button
            ref={ref}
            disabled={isDisabled}
            aria-busy={loading || undefined}
            className={[
                'inline-flex items-center justify-center font-semibold border transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                'disabled:opacity-50 disabled:pointer-events-none',
                'active:scale-[0.98]',
                variants[variant],
                sizes[size],
                fullWidth && 'w-full',
                className,
            ].filter(Boolean).join(' ')}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin -ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : Icon ? (
                <Icon className="h-4 w-4 shrink-0" />
            ) : null}
            {children}
            {IconRight && !loading && <IconRight className="h-4 w-4 shrink-0" />}
        </button>
    );
});

Button.displayName = 'Button';
export default Button;
