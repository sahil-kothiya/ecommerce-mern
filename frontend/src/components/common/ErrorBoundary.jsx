import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

static getDerivedStateFromError(_error) {
        return { hasError: true };
    }

componentDidCatch(error, errorInfo) {
                console.error('ErrorBoundary caught an error:', error, errorInfo);

                this.setState({
            error,
            errorInfo
        });

                if (process.env.NODE_ENV === 'production') {
                    }
    }

handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
                        if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.handleReset);
            }

                        return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
                        <div className="text-center">
                            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <svg
                                    className="h-8 w-8 text-red-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Oops! Something went wrong
                            </h2>
                            
                            <p className="text-gray-600 mb-6">
                                We're sorry for the inconvenience. An unexpected error has occurred.
                            </p>

                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <div className="mb-6 text-left">
                                    <details className="bg-gray-100 p-4 rounded text-sm">
                                        <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                                            Error Details
                                        </summary>
                                        <div className="text-red-600 font-mono text-xs overflow-auto">
                                            <p className="font-bold mb-2">{this.state.error.toString()}</p>
                                            <pre className="whitespace-pre-wrap">
                                                {this.state.errorInfo?.componentStack}
                                            </pre>
                                        </div>
                                    </details>
                                </div>
                            )}

                            <div className="space-y-3">
                                <button
                                    onClick={this.handleReset}
                                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Try Again
                                </button>
                                
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Go to Homepage
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
