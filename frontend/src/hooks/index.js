/**
 * @fileoverview Custom React Hooks Collection
 * @description Reusable hooks for common patterns and state management
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for debouncing values
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} Debounced value
 */
export const useDebounce = (value, delay = 500) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
};

/**
 * Hook for async data fetching with loading and error states
 * @param {Function} asyncFunction - Async function to execute
 * @param {boolean} immediate - Execute immediately on mount
 * @returns {Object} { data, loading, error, execute, reset }
 */
export const useAsync = (asyncFunction, immediate = true) => {
    const [status, setStatus] = useState('idle');
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const execute = useCallback(
        async (...args) => {
            setStatus('loading');
            setData(null);
            setError(null);

            try {
                const response = await asyncFunction(...args);
                setData(response);
                setStatus('success');
                return response;
            } catch (err) {
                setError(err);
                setStatus('error');
                throw err;
            }
        },
        [asyncFunction]
    );

    useEffect(() => {
        if (immediate) {
            execute();
        }
    }, [execute, immediate]);

    const reset = useCallback(() => {
        setStatus('idle');
        setData(null);
        setError(null);
    }, []);

    return {
        data,
        loading: status === 'loading',
        error,
        status,
        execute,
        reset
    };
};

/**
 * Hook for managing local storage with state
 * @param {string} key - Local storage key
 * @param {any} initialValue - Initial value
 * @returns {Array} [storedValue, setValue, removeValue]
 */
export const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error loading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = useCallback(
        (value) => {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value;
                setStoredValue(valueToStore);
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch (error) {
                console.error(`Error setting localStorage key "${key}":`, error);
            }
        },
        [key, storedValue]
    );

    const removeValue = useCallback(() => {
        try {
            window.localStorage.removeItem(key);
            setStoredValue(initialValue);
        } catch (error) {
            console.error(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    return [storedValue, setValue, removeValue];
};

/**
 * Hook for detecting click outside element
 * @param {Function} handler - Function to call when clicked outside
 * @returns {Object} ref - Ref to attach to element
 */
export const useClickOutside = (handler) => {
    const ref = useRef();

    useEffect(() => {
        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) {
                return;
            }
            handler(event);
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [handler]);

    return ref;
};

/**
 * Hook for window resize event
 * @returns {Object} { width, height }
 */
export const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowSize;
};

/**
 * Hook for media query matching
 * @param {string} query - Media query string
 * @returns {boolean} Whether query matches
 */
export const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const handler = (event) => setMatches(event.matches);

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [query]);

    return matches;
};

/**
 * Hook for tracking previous value
 * @param {any} value - Current value
 * @returns {any} Previous value
 */
export const usePrevious = (value) => {
    const ref = useRef();

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
};

/**
 * Hook for interval with cleanup
 * @param {Function} callback - Function to execute
 * @param {number} delay - Delay in milliseconds (null to pause)
 */
export const useInterval = (callback, delay) => {
    const savedCallback = useRef();

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay === null) return;

        const tick = () => savedCallback.current();
        const id = setInterval(tick, delay);

        return () => clearInterval(id);
    }, [delay]);
};

/**
 * Hook for form input handling
 * @param {Object} initialValues - Initial form values
 * @returns {Object} { values, handleChange, handleSubmit, reset, setValues }
 */
export const useForm = (initialValues = {}) => {
    const [values, setValues] = useState(initialValues);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setValues((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    }, []);

    const reset = useCallback(() => {
        setValues(initialValues);
    }, [initialValues]);

    return {
        values,
        handleChange,
        reset,
        setValues
    };
};

/**
 * Hook for pagination logic
 * @param {Array} items - Array of items to paginate
 * @param {number} itemsPerPage - Number of items per page
 * @returns {Object} Pagination state and methods
 */
export const usePagination = (items, itemsPerPage = 10) => {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = items.slice(startIndex, endIndex);

    const goToPage = useCallback((page) => {
        const pageNumber = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(pageNumber);
    }, [totalPages]);

    const nextPage = useCallback(() => {
        goToPage(currentPage + 1);
    }, [currentPage, goToPage]);

    const previousPage = useCallback(() => {
        goToPage(currentPage - 1);
    }, [currentPage, goToPage]);

    return {
        currentPage,
        totalPages,
        currentItems,
        goToPage,
        nextPage,
        previousPage,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1
    };
};

/**
 * Hook for toggle state
 * @param {boolean} initialState - Initial state
 * @returns {Array} [state, toggle, setTrue, setFalse]
 */
export const useToggle = (initialState = false) => {
    const [state, setState] = useState(initialState);

    const toggle = useCallback(() => setState((prev) => !prev), []);
    const setTrue = useCallback(() => setState(true), []);
    const setFalse = useCallback(() => setState(false), []);

    return [state, toggle, setTrue, setFalse];
};

/**
 * Hook for scroll position
 * @returns {Object} { x, y }
 */
export const useScrollPosition = () => {
    const [scrollPosition, setScrollPosition] = useState({
        x: window.pageXOffset,
        y: window.pageYOffset
    });

    useEffect(() => {
        const handleScroll = () => {
            setScrollPosition({
                x: window.pageXOffset,
                y: window.pageYOffset
            });
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return scrollPosition;
};
