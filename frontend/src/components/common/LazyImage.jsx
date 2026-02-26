import { useEffect, useRef, useState } from 'react';

/**
 * LazyImage - Intersection-Observer-driven image with shimmer skeleton + blur reveal.
 *
 * Props:
 *  src              - image url (string | null)
 *  alt              - alt text
 *  className        - classes applied to <img>
 *  wrapperClassName - classes applied to wrapper <div> (must include height)
 *  fallback         - node shown when src is missing or failed to load
 *  rootMargin       - how far ahead to start loading (default "250px 0px")
 */
const LazyImage = ({
    src,
    alt = '',
    className = '',
    wrapperClassName = '',
    fallback = null,
    rootMargin = '250px 0px',
}) => {
    const wrapperRef = useRef(null);
    const [inView, setInView]   = useState(false);
    const [loaded, setLoaded]   = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setLoaded(false);
        setHasError(false);
    }, [src]);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        // Use native IntersectionObserver — fires once, then disconnects.
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    obs.disconnect();
                }
            },
            { rootMargin }
        );

        obs.observe(el);
        return () => obs.disconnect();
    }, [rootMargin]);

    const showFallback = hasError || (!src && inView);
    const showSkeleton = !loaded && !showFallback;

    return (
        <div ref={wrapperRef} className={`relative overflow-hidden ${wrapperClassName}`}>
            {/* Shimmer layer — visible until image finishes loading */}
            {showSkeleton && (
                <div className="img-shimmer absolute inset-0" aria-hidden="true" />
            )}

            {/* Real image — starts blurred/invisible, transitions to sharp */}
            {inView && src && !hasError && (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    fetchPriority="low"
                    decoding="async"
                    className={`${className} img-reveal ${loaded ? 'img-reveal--loaded' : ''}`}
                    onLoad={() => setLoaded(true)}
                    onError={() => setHasError(true)}
                />
            )}

            {/* Fallback slot */}
            {showFallback && fallback}
        </div>
    );
};

export default LazyImage;
