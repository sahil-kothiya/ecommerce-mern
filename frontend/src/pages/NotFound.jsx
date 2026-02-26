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
            <div className="max-w-3xl w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
                <p className="text-6xl font-black text-slate-800">404</p>
                <h1 className="mt-3 text-4xl font-bold text-gray-800">Oops! Page Not Found</h1>
                <p className="mt-3 text-lg text-gray-600">
                    The page you&apos;re looking for seems to have wandered off.
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link
                        to="/"
                        className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-7 py-3 text-white font-semibold"
                    >
                        Back to Home
                    </Link>
                    <button
                        onClick={() => navigate(-1)}
                        className="rounded-full border border-slate-300 bg-white px-7 py-3 font-semibold text-slate-700"
                    >
                        Go Back
                    </button>
                </div>

                <p className="mt-6 text-sm text-slate-600">
                    Redirecting to home in <span className="font-bold text-purple-700">{countdown}</span> seconds
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link to="/products" className="rounded-full bg-purple-50 px-4 py-2 text-purple-700">Shop Products</Link>
                    <Link to="/cart" className="rounded-full bg-blue-50 px-4 py-2 text-blue-700">View Cart</Link>
                    <Link to="/login" className="rounded-full bg-pink-50 px-4 py-2 text-pink-700">My Account</Link>
                    <Link to="/wishlist" className="rounded-full bg-yellow-50 px-4 py-2 text-yellow-700">Wishlist</Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
