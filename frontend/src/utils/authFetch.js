/**
 * Shared authenticated fetch utility for admin API calls.
 * Uses cookie-based auth via credentials: 'include'.
 */

export const getAuthHeaders = () => {
  return {};
};

/**
 * Drop-in replacement for fetch() that always sends auth cookies.
 * For FormData bodies, do NOT set Content-Type (browser sets it with boundary).
 */
const authFetch = (url, options = {}) => {
  const { headers = {}, ...rest } = options;
  return fetch(url, {
    credentials: "include",
    ...rest,
    headers: { ...getAuthHeaders(), ...headers },
  });
};

export default authFetch;
