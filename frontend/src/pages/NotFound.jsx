import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NotFound = () => {
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(10);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center px-4 py-16">
            <div className="max-w-4xl w-full">
                {/* Main Content */}
                <div className="text-center">
                    {/* Animated 404 */}
                    <div className="relative mb-8">
                        <h1 className="text-[200px] md:text-[300px] font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 leading-none animate-pulse">
                            404
                        </h1>
                        {/* Floating Elements */}
                        <div className="absolute top-0 left-1/4 w-20 h-20 bg-purple-400 rounded-full opacity-20 animate-bounce"></div>
                        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-blue-400 rounded-full opacity-20 animate-bounce delay-100"></div>
                        <div className="absolute bottom-0 left-1/2 w-12 h-12 bg-pink-400 rounded-full opacity-20 animate-bounce delay-200"></div>
                    </div>

                    {/* Error Message */}
                    <div className="mb-12">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                            Oops! Page Not Found
                        </h2>
                        <p className="text-xl text-gray-600 mb-2">
                            The page you're looking for seems to have wandered off...
                        </p>
                        <p className="text-lg text-gray-500">
                            Don't worry, even the best explorers get lost sometimes! 🧭
                        </p>
                    </div>

                    {/* Illustration */}
                    <div className="mb-12 relative">
                        <div className="inline-block relative">
                            {/* Shopping Cart Icon */}
                            <svg 
                                className="w-48 h-48 md:w-64 md:h-64 mx-auto text-gray-300"
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={1.5} 
                                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
                                />
                            </svg>
                            {/* Sad Face Overlay */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl">
                                😢
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                        <Link
                            to="/"
                            className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Back to Home
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </Link>

                        <button
                            onClick={() => navigate(-1)}
                            className="px-8 py-4 bg-white text-gray-700 rounded-full font-bold text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-gray-200 hover:border-purple-300"
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Go Back
                            </span>
                        </button>
                    </div>

                    {/* Auto-redirect countdown */}
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-lg border-2 border-purple-100">
                        <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                        <p className="text-gray-600 font-medium">
                            Redirecting to home in <span className="font-bold text-purple-600">{countdown}</span> seconds
                        </p>
                    </div>

                    {/* Helpful Links */}
                    <div className="mt-16 pt-8 border-t border-gray-200">
                        <p className="text-gray-600 mb-4 font-semibold">Looking for something specific?</p>
                        <div className="flex flex-wrap gap-3 justify-center">
                            <Link
                                to="/products"
                                className="px-5 py-2 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors font-medium"
                            >
                                🛍️ Shop Products
                            </Link>
                            <Link
                                to="/cart"
                                className="px-5 py-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors font-medium"
                            >
                                🛒 View Cart
                            </Link>
                            <Link
                                to="/login"
                                className="px-5 py-2 bg-pink-50 text-pink-600 rounded-full hover:bg-pink-100 transition-colors font-medium"
                            >
                                👤 My Account
                            </Link>
                            <Link
                                to="/wishlist"
                                className="px-5 py-2 bg-yellow-50 text-yellow-600 rounded-full hover:bg-yellow-100 transition-colors font-medium"
                            >
                                ❤️ Wishlist
                            </Link>
                        </div>
                    </div>

                    {/* Fun Fact */}
                    <div className="mt-12 p-6 bg-gradient-to-r from-purple-100 via-blue-100 to-pink-100 rounded-2xl">
                        <p className="text-gray-700 text-sm">
                            <span className="font-bold">💡 Fun Fact:</span> The first 404 error was at CERN in 1992, 
                            when a developer tried to access a page that didn't exist. Now you're part of internet history! 🎉
                        </p>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-purple-200 rounded-full filter blur-3xl opacity-30 -z-10"></div>
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-200 rounded-full filter blur-3xl opacity-30 -z-10"></div>
                <div className="absolute top-1/2 left-1/2 w-36 h-36 bg-pink-200 rounded-full filter blur-3xl opacity-20 -z-10"></div>
            </div>

            {/* CSS for custom animations */}
            <style>{`
                @keyframes bounce {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-20px);
                    }
                }
                .delay-100 {
                    animation-delay: 0.1s;
                }
                .delay-200 {
                    animation-delay: 0.2s;
                }
            `}</style>
        </div>
    );
};

export default NotFound;
