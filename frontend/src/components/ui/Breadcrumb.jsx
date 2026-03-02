import { Link } from 'react-router-dom';

const Breadcrumb = ({ items = [], className = '' }) => {
    if (!items.length) return null;

    return (
        <nav className={`flex items-center text-sm ${className}`} aria-label="Breadcrumb">
            <ol className="flex items-center gap-1">
                {items.map((item, idx) => {
                    const isLast = idx === items.length - 1;

                    return (
                        <li key={item.label} className="flex items-center gap-1">
                            {idx > 0 && (
                                <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 4l4 4-4 4" />
                                </svg>
                            )}

                            {isLast ? (
                                <span className="font-medium text-slate-800 truncate max-w-[200px]">
                                    {item.icon && <item.icon className="h-3.5 w-3.5 mr-1 inline-block" />}
                                    {item.label}
                                </span>
                            ) : (
                                <Link
                                    to={item.to || '#'}
                                    className="text-slate-500 hover:text-primary-600 transition-colors truncate max-w-[160px]"
                                >
                                    {item.icon && <item.icon className="h-3.5 w-3.5 mr-1 inline-block" />}
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumb;
