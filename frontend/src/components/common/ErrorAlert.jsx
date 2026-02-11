import React from 'react';

// ============================================================================
// ERROR ALERT COMPONENT
// ============================================================================
// Reusable component for displaying validation errors in a consistent format
const ErrorAlert = ({ 
    errors = [], 
    title = "Validation Errors:", 
    className = "", 
    onClose = null 
}) => {
    // Don't render if no errors
    if (!errors || errors.length === 0) return null;

    return (
        <div className={`mb-6 p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
            <div className="flex items-start gap-2">
                {/* Error Icon */}
                <svg 
                    className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                >
                    <path 
                        fillRule="evenodd" 
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                        clipRule="evenodd" 
                    />
                </svg>
                
                <div className="flex-1">
                    {/* Error Title */}
                    <p className="text-red-600 text-sm font-semibold mb-1">
                        {title}
                    </p>
                    
                    {/* Error List */}
                    <div className="text-red-600 text-sm">
                        {errors.map((error, index) => (
                            <div key={index} className="mb-1">
                                • {error}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Close Button (Optional) */}
                {onClose && (
                    <button 
                        onClick={onClose}
                        className="text-red-600 hover:text-red-700 flex-shrink-0"
                        type="button"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path 
                                fillRule="evenodd" 
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                                clipRule="evenodd" 
                            />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default ErrorAlert;