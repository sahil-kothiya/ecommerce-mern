const Skeleton = ({ className = '', variant = 'rect', count = 1 }) => {
    const base = 'animate-pulse bg-slate-200 rounded';

    const variants = {
        rect: 'h-4 w-full rounded-md',
        circle: 'h-10 w-10 rounded-full',
        card: 'h-48 w-full rounded-xl',
        text: 'h-3 w-3/4 rounded',
        avatar: 'h-12 w-12 rounded-full',
        button: 'h-10 w-24 rounded-lg',
        image: 'aspect-square w-full rounded-xl',
    };

    if (count > 1) {
        return (
            <div className="space-y-3">
                {Array.from({ length: count }, (_, i) => (
                    <div key={i} className={`${base} ${variants[variant]} ${className}`} />
                ))}
            </div>
        );
    }

    return <div className={`${base} ${variants[variant]} ${className}`} />;
};

const SkeletonCard = ({ className = '' }) => (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 space-y-3 ${className}`}>
        <Skeleton variant="image" />
        <Skeleton variant="text" className="w-1/3" />
        <Skeleton variant="rect" className="h-5 w-2/3" />
        <Skeleton variant="text" className="w-1/2" />
    </div>
);

const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => (
    <div className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${className}`}>
        <div className="bg-slate-50 px-4 py-3 flex gap-4">
            {Array.from({ length: cols }, (_, i) => (
                <Skeleton key={i} className="h-3 flex-1" />
            ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="px-4 py-3 flex gap-4 border-t border-slate-100">
                {Array.from({ length: cols }, (_, c) => (
                    <Skeleton key={c} className="h-3 flex-1" />
                ))}
            </div>
        ))}
    </div>
);

Skeleton.Card = SkeletonCard;
Skeleton.Table = SkeletonTable;

export default Skeleton;
