import { useCallback, useMemo } from 'react';

const Pagination = ({
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    siblingCount = 1,
    showEdges = true,
    size = 'md',
    className = '',
}) => {
    const range = useCallback((start, end) => {
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }, []);

    const pages = useMemo(() => {
        const totalPageNumbers = siblingCount * 2 + 3 + (showEdges ? 2 : 0);

        if (totalPages <= totalPageNumbers) {
            return range(1, totalPages);
        }

        const leftSiblingIdx = Math.max(currentPage - siblingCount, 1);
        const rightSiblingIdx = Math.min(currentPage + siblingCount, totalPages);

        const showLeftDots = leftSiblingIdx > 2;
        const showRightDots = rightSiblingIdx < totalPages - 1;

        if (!showLeftDots && showRightDots) {
            const leftCount = 3 + 2 * siblingCount;
            return [...range(1, leftCount), 'dots-r', totalPages];
        }

        if (showLeftDots && !showRightDots) {
            const rightCount = 3 + 2 * siblingCount;
            return [1, 'dots-l', ...range(totalPages - rightCount + 1, totalPages)];
        }

        return [1, 'dots-l', ...range(leftSiblingIdx, rightSiblingIdx), 'dots-r', totalPages];
    }, [currentPage, totalPages, siblingCount, showEdges, range]);

    if (totalPages <= 1) return null;

    const sizeClasses = {
        sm: 'h-8 min-w-[2rem] text-xs',
        md: 'h-9 min-w-[2.25rem] text-sm',
        lg: 'h-10 min-w-[2.5rem] text-sm',
    };

    const btnBase = `${sizeClasses[size]} px-2 rounded-lg font-medium transition-all duration-150 inline-flex items-center justify-center`;
    const btnNormal = `${btnBase} text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent`;
    const btnActive = `${btnBase} bg-primary-600 text-white border border-primary-600 shadow-sm`;
    const btnDisabled = `${btnBase} text-slate-300 cursor-not-allowed`;

    return (
        <nav className={`flex flex-wrap items-center gap-1 ${className}`} aria-label="Pagination">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={currentPage === 1 ? btnDisabled : btnNormal}
                aria-label="Previous page"
            >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 4l-4 4 4 4" />
                </svg>
            </button>

            {pages.map((page) => {
                if (typeof page === 'string') {
                    return (
                        <span key={page} className={`${sizeClasses[size]} inline-flex items-center justify-center text-slate-400`}>
                            ...
                        </span>
                    );
                }

                return (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={page === currentPage ? btnActive : btnNormal}
                        aria-current={page === currentPage ? 'page' : undefined}
                        aria-label={`Page ${page}`}
                    >
                        {page}
                    </button>
                );
            })}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={currentPage === totalPages ? btnDisabled : btnNormal}
                aria-label="Next page"
            >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 4l4 4-4 4" />
                </svg>
            </button>
        </nav>
    );
};

export default Pagination;
