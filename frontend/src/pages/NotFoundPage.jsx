import { Link } from 'react-router-dom';

const NotFoundPage = () => {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
                <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
                <Link to="/" className="btn btn-primary px-6 py-3">
                    Go Home
                </Link>
            </div>
        </div>
    );
};

export default NotFoundPage;
