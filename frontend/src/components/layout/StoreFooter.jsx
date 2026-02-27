import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_CONFIG } from '../../constants';
import { useSiteSettings } from '../../context/useSiteSettings';
import { resolveImageUrl } from '../../utils/imageUrl';

const QUICK_LINKS = [
    { label: 'About Us', href: '/products' },
    { label: 'Contact Us', href: '/account' },
    { label: 'FAQ', href: '/products' },
    { label: 'Track Your Order', href: '/account/orders' },
    { label: 'Returns & Exchanges', href: '/account/returns' },
    { label: 'Wishlist', href: '/wishlist' },
];

const SOCIAL_ICONS = {
    twitter: <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>,
    facebook: <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
    instagram: <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12c0 3.259.014 3.668.072 4.948.058 1.277.26 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24c3.259 0 3.668-.014 4.948-.072 1.277-.058 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.948 0-3.259-.014-3.667-.072-4.947-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.259 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" /></svg>,
    youtube: <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>,
};

const StoreFooter = () => {
    const { settings } = useSiteSettings();
    const [categories, setCategories] = useState([]);
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const siteName = String(settings?.siteName || 'Enterprise E-Commerce').trim();
    const siteTagline = String(settings?.siteTagline || '').trim();
    const logoUrl = resolveImageUrl(settings?.logo, { placeholder: null });
    const brandMark = siteName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() || '')
        .join('') || 'EC';

    const socialLinks = useMemo(() => {
        const candidates = [
            { key: 'facebook', label: 'Facebook', href: settings?.facebook },
            { key: 'instagram', label: 'Instagram', href: settings?.instagram },
            { key: 'twitter', label: 'Twitter', href: settings?.twitter },
            { key: 'youtube', label: 'YouTube', href: settings?.youtube },
        ];

        return candidates.filter((entry) => String(entry.href || '').trim().startsWith('http'));
    }, [settings?.facebook, settings?.instagram, settings?.twitter, settings?.youtube]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}?limit=6`);
                if (!res.ok) return;
                const data = await res.json();
                const cats = Array.isArray(data?.data) ? data.data : (data?.data?.categories || []);
                setCategories(cats.slice(0, 6));
            } catch {
            }
        };
        fetchCategories();
    }, []);

    const handleSubscribe = (e) => {
        e.preventDefault();
        if (email.trim()) {
            setSubscribed(true);
            setEmail('');
        }
    };

    return (
        <footer className="store-footer">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-5">
                        <div className="flex items-center gap-3">
                            <span className="store-brand-mark flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl text-sm font-black text-white">
                                {logoUrl ? <img src={logoUrl} alt={siteName} className="h-full w-full object-cover" /> : brandMark}
                            </span>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#a5bbfc]">{siteTagline || 'Creator Store'}</p>
                                <p className="store-display text-base text-white">{siteName}</p>
                            </div>
                        </div>
                        <p className="text-sm leading-relaxed text-[#8fa8d8]">
                            {settings?.metaDescription || 'Your trusted partner for premium products and smooth online shopping.'}
                        </p>
                        {socialLinks.length > 0 && (
                            <div className="flex gap-2.5">
                                {socialLinks.map((social) => (
                                    <a
                                        key={social.key}
                                        href={social.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={social.label}
                                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(165,187,252,0.2)] bg-[rgba(165,187,252,0.08)] text-[#a5bbfc] transition hover:border-[rgba(165,187,252,0.45)] hover:bg-[rgba(165,187,252,0.18)] hover:text-white"
                                    >
                                        {SOCIAL_ICONS[social.key]}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#a5bbfc]">Categories</h3>
                        <ul className="space-y-2">
                            {categories.map((cat) => (
                                <li key={cat._id || cat.slug}>
                                    <Link to={`/products?category=${cat.slug}`} className="text-sm text-[#8fa8d8] transition hover:text-[#a5bbfc]">
                                        {cat.title}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <Link to="/products" className="text-sm font-semibold text-[#ffa336] hover:text-[#f9730c] transition">
                                    View All {'->'}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#a5bbfc]">Quick Links</h3>
                        <ul className="space-y-2">
                            {QUICK_LINKS.map((link) => (
                                <li key={link.label}>
                                    <Link to={link.href} className="text-sm text-[#8fa8d8] transition hover:text-[#a5bbfc]">{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#a5bbfc]">Stay Connected</h3>
                        <p className="text-sm text-[#8fa8d8]">Subscribe for exclusive offers and new product alerts.</p>
                        {subscribed ? (
                            <div className="rounded-xl border border-[rgba(165,187,252,0.25)] bg-[rgba(165,187,252,0.1)] p-4 text-sm font-semibold text-[#a5bbfc]">
                                You're subscribed. Thanks for joining.
                            </div>
                        ) : (
                            <form onSubmit={handleSubscribe} className="space-y-2.5">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                    className="w-full rounded-xl border border-[rgba(165,187,252,0.25)] bg-[rgba(255,255,255,0.06)] px-4 py-2.5 text-sm text-white placeholder-[#5a7ab8] outline-none focus:border-[rgba(165,187,252,0.55)] focus:bg-[rgba(255,255,255,0.1)]"
                                />
                                <button type="submit" className="store-btn-primary w-full rounded-xl px-4 py-2.5 text-sm">
                                    Subscribe Now
                                </button>
                            </form>
                        )}
                        <div className="space-y-1 pt-1 text-xs text-[#8fa8d8]">
                            {settings?.supportEmail && <p>Support: {settings.supportEmail}</p>}
                            {settings?.phone && <p>Phone: {settings.phone}</p>}
                            {settings?.address && <p>{settings.address}</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-[rgba(165,187,252,0.15)]">
                <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
                        <p className="text-xs text-[#5a7ab8]">
                            © {new Date().getFullYear()} {siteName}. All rights reserved.
                        </p>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-[#5a7ab8]">Currency: {settings?.currencyCode || 'USD'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default StoreFooter;
