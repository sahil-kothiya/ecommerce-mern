import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[calc(100vw-2rem)]',
};

const Modal = ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    footer,
    size = 'md',
    closeOnOverlay = true,
    showClose = true,
    className = '',
}) => {
    const overlayRef = useRef(null);
    const contentRef = useRef(null);
    const previousFocusRef = useRef(null);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose?.();
            return;
        }

        if (e.key === 'Tab' && contentRef.current) {
            const focusable = contentRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement;
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';

            requestAnimationFrame(() => {
                const focusable = contentRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
                if (focusable?.length) focusable[0].focus();
                else contentRef.current?.focus();
            });
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            if (!isOpen && previousFocusRef.current) {
                previousFocusRef.current?.focus?.();
                previousFocusRef.current = null;
            }
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
                onClick={() => closeOnOverlay && onClose?.()}
                aria-hidden="true"
            />

            <div
                ref={contentRef}
                tabIndex={-1}
                className={[
                    'relative w-full rounded-2xl border border-slate-200 bg-white shadow-2xl',
                    'animate-fade-in-scale overflow-hidden',
                    sizeMap[size],
                    className,
                ].filter(Boolean).join(' ')}
            >
                {(title || showClose) && (
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
                        <div>
                            {title && (
                                <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
                                    {title}
                                </h2>
                            )}
                            {subtitle && (
                                <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
                            )}
                        </div>

                        {showClose && (
                            <button
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                aria-label="Close modal"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}

                <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                    {children}
                </div>

                {footer && (
                    <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
