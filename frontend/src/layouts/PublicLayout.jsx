import { Outlet } from 'react-router-dom';
import StoreHeader from '../components/layout/StoreHeader';
import StoreFooter from '../components/layout/StoreFooter';

const PublicLayout = () => {
    return (
        <div className="site-shell flex min-h-screen flex-col">
            <div className="site-noise" aria-hidden="true" />
            <div className="site-glow site-glow-left" aria-hidden="true" />
            <div className="site-glow site-glow-right" aria-hidden="true" />
            <StoreHeader />
            {/* top padding accounts for fixed header (~105px) */}
            <main className="relative z-10 flex-1 pt-[105px] sm:pt-[120px]">
                <Outlet />
            </main>
            <StoreFooter />
        </div>
    );
};

export default PublicLayout;
