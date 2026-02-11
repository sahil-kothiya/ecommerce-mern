import React from 'react';

// ============================================================================
// FIELD ERROR COMPONENT
// ============================================================================
// Reusable component for displaying individual field validation errors
const FieldError = ({ 
    error, 
    className = "",
    showIcon = true 
}) => {
    // Don't render if no error
    if (!error) return null;

    return (
        <div className={`flex items-start gap-1 mt-1 ${className}`}>
            {/* Error Icon */}
            {showIcon && (
                <svg 
                    className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                >
                    <path 
                        fillRule="evenodd" 
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                        clipRule="evenodd" 
                    />
                </svg>
            )}
            
            {/* Error Message */}
            <p className="text-sm text-red-600 font-medium">
                {error}
            </p>
        </div>
    );
};

export default FieldError;