const illustrations = {
    empty: (
        <svg className="h-24 w-24 text-slate-300" viewBox="0 0 96 96" fill="none">
            <rect x="16" y="24" width="64" height="48" rx="8" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
            <circle cx="48" cy="48" r="12" stroke="currentColor" strokeWidth="2" />
            <path d="M44 48h8M48 44v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    search: (
        <svg className="h-24 w-24 text-slate-300" viewBox="0 0 96 96" fill="none">
            <circle cx="42" cy="42" r="18" stroke="currentColor" strokeWidth="2" />
            <path d="M55 55l16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M36 42h12M42 36v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </svg>
    ),
    error: (
        <svg className="h-24 w-24 text-red-300" viewBox="0 0 96 96" fill="none">
            <circle cx="48" cy="48" r="24" stroke="currentColor" strokeWidth="2" />
            <path d="M48 36v16M48 58v2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    ),
};

const EmptyState = ({
    icon,
    illustration = 'empty',
    title = 'No items found',
    description,
    action,
    className = '',
}) => {
    return (
        <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
            <div className="mb-5">
                {icon || illustrations[illustration] || illustrations.empty}
            </div>

            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>

            {description && (
                <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
            )}

            {action && <div className="mt-5">{action}</div>}
        </div>
    );
};

export default EmptyState;
