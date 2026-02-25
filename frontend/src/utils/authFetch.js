/**
 * Shared authenticated fetch utility for admin API calls.
 * Automatically attaches Authorization header from localStorage + credentials: 'include'.
 */

export const getAuthHeaders = () => {
  const token =
    localStorage.getItem("auth_token") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Drop-in replacement for fetch() that always sends the Bearer token.
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
