import { useEffect, useRef, useState } from 'react';
import { logger } from '../../utils/logger.js';

// Three-slot lazy loader: shownSrc (visible), outgoingSrc (sliding away), loadingSrc (preloading).
// First load shows shimmer → fade-in. Subsequent swaps use left/right slide transitions.
const SLIDE_DURATION_MS = 420;

const LazyImage = ({
    src,
    alt = '',
    className = '',
    wrapperClassName = '',
    fallback = null,
    rootMargin = '250px 0px',
    onImageError = null,
}) => {
    const wrapperRef     = useRef(null);
    const slideTimerRef  = useRef(null);

    const [inView, setInView]           = useState(false);
    const [shownSrc, setShownSrc]       = useState(null);   // currently displayed image
    const [outgoingSrc, setOutgoingSrc] = useState(null);   // sliding-out image
    const [loadingSrc, setLoadingSrc]   = useState(null);   // being silently pre-loaded
    const [isSliding, setIsSliding]     = useState(false);  // slide animation active?

    // Queue new src for silent preload whenever the parent changes it.
    useEffect(() => {
        if (!src || src === shownSrc) return;
        setLoadingSrc(src);
    }, [src]); // shownSrc intentionally omitted to prevent loop

    // IntersectionObserver — fires once then disconnects.
    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
            { rootMargin }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [rootMargin]);

    // Cleanup slide timer on unmount.
    useEffect(() => () => clearTimeout(slideTimerRef.current), []);

    /** Called when the hidden pre-loader successfully loads `loadingSrc`. */
    const handlePreloadLoaded = () => {
        const incoming = loadingSrc;
        setLoadingSrc(null);

        if (shownSrc) {
            // Slide transition: outgoing slides left, incoming slides in from right.
            setOutgoingSrc(shownSrc);
            setIsSliding(true);
            clearTimeout(slideTimerRef.current);
            slideTimerRef.current = setTimeout(() => {
                setOutgoingSrc(null);
                setIsSliding(false);
            }, SLIDE_DURATION_MS);
        }

        setShownSrc(incoming);
        logger.debug('[LazyImage] promoted:', incoming, shownSrc ? '(slide)' : '(first load)');
    };

    /** Called when the hidden pre-loader fails to load `loadingSrc`. */
    const handlePreloadError = () => {
        const failedSrc = loadingSrc;
        logger.debug('[LazyImage] error:', failedSrc);
        setLoadingSrc(null);
        if (typeof onImageError === 'function') onImageError(failedSrc);
        // Keep shownSrc visible — HomePage will remove failed url and serve next valid one.
    };

    // Show shimmer only during first load (no shownSrc yet).
    const showSkeleton = !shownSrc && inView && !!src;
    // Show fallback only when there is truly nothing to render.
    const showFallback = !shownSrc && !loadingSrc && (!src || !inView);

    return (
        <div ref={wrapperRef} className={`relative overflow-hidden ${wrapperClassName}`}>

            {/* Shimmer — first load only */}
            {showSkeleton && <div className="img-shimmer absolute inset-0" aria-hidden="true" />}

            {/* Outgoing image — slides to the left, absolutely positioned so layout stays stable */}
            {outgoingSrc && (
                <img
                    key={`out-${outgoingSrc}`}
                    src={outgoingSrc}
                    alt=""
                    aria-hidden="true"
                    decoding="async"
                    className={`${className} img-slide-out`}
                />
            )}

            {/* Visible / incoming image */}
            {shownSrc && (
                <img
                    key={`in-${shownSrc}`}
                    src={shownSrc}
                    alt={alt}
                    decoding="async"
                    className={
                        isSliding
                            ? `${className} img-slide-in`           // slide in from right
                            : `${className} img-reveal img-reveal--loaded` // first-load static
                    }
                />
            )}

            {/* Silent preloader — 0×0, invisible, just triggers browser fetch */}
            {inView && loadingSrc && (
                <img
                    key={`pre-${loadingSrc}`}
                    src={loadingSrc}
                    alt=""
                    loading="lazy"
                    fetchPriority="low"
                    decoding="async"
                    aria-hidden="true"
                    style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
                    onLoad={handlePreloadLoaded}
                    onError={handlePreloadError}
                />
            )}

            {/* Fallback — only when there is nothing to show */}
            {showFallback && fallback}
        </div>
    );
};

export default LazyImage;

