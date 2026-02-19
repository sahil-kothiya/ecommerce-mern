import { useCallback, useEffect, useState } from 'react';
import { API_CONFIG } from '../constants';
import authService from '../services/authService';

export const useWishlistCount = () => {
    const [count, setCount] = useState(0);

    const refresh = useCallback(async () => {
        if (!authService.isAuthenticated()) {
            setCount(0);
            return;
        }

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WISHLIST}`, {
                headers: authService.getAuthHeaders(),
            });
            const payload = await response.json();

            if (!response.ok) {
                setCount(0);
                return;
            }

            const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];
            setCount(items.length);
        } catch {
            setCount(0);
        }
    }, []);

    useEffect(() => {
        refresh();

        const onWishlistChanged = () => refresh();
        const onFocus = () => refresh();
        window.addEventListener('wishlist:changed', onWishlistChanged);
        window.addEventListener('focus', onFocus);

        return () => {
            window.removeEventListener('wishlist:changed', onWishlistChanged);
            window.removeEventListener('focus', onFocus);
        };
    }, [refresh]);

    return { count, refresh };
};

export default useWishlistCount;
