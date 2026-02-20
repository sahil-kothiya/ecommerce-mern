import React from 'react';

const FieldError = ({ error, className = '' }) => {
    if (!error) return null;

    return (
        <p
            role="alert"
            className={`mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600 ${className}`}
        >
            
            <svg
                className="h-3 w-3 shrink-0"
                fill="currentColor"
                viewBox="0 0 6 6"
                aria-hidden="true"
            >
                <circle cx="3" cy="3" r="3" />
            </svg>
            {error}
        </p>
    );
};

export default FieldError;