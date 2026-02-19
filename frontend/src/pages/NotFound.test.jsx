import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from './NotFound.jsx';

describe('NotFound page', () => {
    test('renders core 404 content and helper links', () => {
        render(
            <MemoryRouter
                future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                }}
            >
                <NotFound />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: /oops! page not found/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /shop products/i })).toBeInTheDocument();
        expect(screen.getByText(/redirecting to home in/i)).toBeInTheDocument();
    });
});
