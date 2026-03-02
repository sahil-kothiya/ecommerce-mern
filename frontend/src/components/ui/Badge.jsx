const variantMap = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-primary-50 text-primary-700 border-primary-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
};

const sizeMap = {
    xs: 'text-[10px] px-1.5 py-0.5 rounded',
    sm: 'text-xs px-2 py-0.5 rounded-md',
    md: 'text-xs px-2.5 py-1 rounded-lg',
    lg: 'text-sm px-3 py-1 rounded-lg',
};

const Badge = ({
    children,
    variant = 'default',
    size = 'sm',
    dot = false,
    icon: Icon,
    removable = false,
    onRemove,
    className = '',
}) => {
    return (
        <span
            className={[
                'inline-flex items-center gap-1 font-semibold border whitespace-nowrap',
                variantMap[variant],
                sizeMap[size],
                className,
            ].filter(Boolean).join(' ')}
        >
            {dot && (
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            )}
            {Icon && <Icon className="h-3 w-3 shrink-0" />}
            {children}
            {removable && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="ml-0.5 -mr-0.5 h-3.5 w-3.5 rounded-full hover:bg-black/10 inline-flex items-center justify-center transition-colors"
                    aria-label="Remove"
                >
                    <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3l6 6M9 3l-6 6" />
                    </svg>
                </button>
            )}
        </span>
    );
};

export default Badge;
