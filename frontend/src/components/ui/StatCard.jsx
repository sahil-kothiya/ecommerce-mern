const StatCard = ({
    title,
    value,
    change,
    changeType = 'neutral',
    icon: Icon,
    iconBg = 'bg-primary-50',
    iconColor = 'text-primary-600',
    loading = false,
    className = '',
}) => {
    const changeColors = {
        positive: 'text-emerald-600 bg-emerald-50',
        negative: 'text-red-600 bg-red-50',
        neutral: 'text-slate-600 bg-slate-50',
    };

    if (loading) {
        return (
            <div className={`rounded-xl border border-slate-200 bg-white p-5 animate-pulse ${className}`}>
                <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-lg bg-slate-200" />
                    <div className="h-4 w-16 rounded bg-slate-200" />
                </div>
                <div className="mt-4 h-7 w-20 rounded bg-slate-200" />
                <div className="mt-1.5 h-3 w-24 rounded bg-slate-200" />
            </div>
        );
    }

    return (
        <div className={`group rounded-xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:shadow-card-hover hover:border-primary-200 ${className}`}>
            <div className="flex items-center justify-between">
                {Icon && (
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
                        <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>
                )}
                {change !== undefined && (
                    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${changeColors[changeType]}`}>
                        {changeType === 'positive' && '↑'}
                        {changeType === 'negative' && '↓'}
                        {change}
                    </span>
                )}
            </div>

            <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
                <p className="mt-0.5 text-sm text-slate-500">{title}</p>
            </div>
        </div>
    );
};

export default StatCard;
