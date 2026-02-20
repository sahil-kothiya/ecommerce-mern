import React from 'react';

const ErrorAlert = ({
    errors = [],
    className = '',
    onClose = null,
        title,
}) => {
        const validErrors = (errors || []).filter((e) => e && String(e).trim());
    if (!validErrors.length) return null;

    return (
        <div
            role="alert"
            className={`flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm ${className}`}
        >
            
            <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
            >
                <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                />
            </svg>

<div className="flex-1 leading-relaxed text-red-700">
                {validErrors.length === 1 ? (
                    <span>{validErrors[0]}</span>
                ) : (
                    <ul className="space-y-0.5">
                        {validErrors.map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                    </ul>
                )}
            </div>

{onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Dismiss"
                    className="shrink-0 text-red-400 transition-colors hover:text-red-600"
                >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>
            )}
        </div>
    );
};

export default ErrorAlert;