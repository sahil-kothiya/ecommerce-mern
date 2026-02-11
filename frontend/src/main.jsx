

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import { store } from './store';
import './index.css';

/**
 * Render application with all necessary providers
 * - StrictMode: Highlights potential problems in development
 * - ErrorBoundary: Catches and handles runtime errors gracefully
 * - Redux Provider: Global state management
 * - BrowserRouter: Client-side routing with React Router v7 features
 * - Toaster: Global toast notifications
 */
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <Provider store={store}>
                <BrowserRouter
                    future={{
                        v7_startTransition: true,
                        v7_relativeSplatPath: true,
                    }}
                >
                    <App />
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 3000,
                            style: {
                                background: '#363636',
                                color: '#fff',
                            },
                            success: {
                                duration: 3000,
                                iconTheme: {
                                    primary: '#10b981',
                                    secondary: '#fff',
                                },
                            },
                            error: {
                                duration: 4000,
                                iconTheme: {
                                    primary: '#ef4444',
                                    secondary: '#fff',
                                },
                            },
                        }}
                    />
                </BrowserRouter>
            </Provider>
        </ErrorBoundary>
    </React.StrictMode>
);
