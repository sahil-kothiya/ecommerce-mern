

import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import { store } from './store';
import './index.css';

const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
    if (init.credentials) {
        return originalFetch(input, init);
    }

    return originalFetch(input, {
        ...init,
        credentials: 'include',
    });
};

ReactDOM.createRoot(document.getElementById('root')).render(
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
);
