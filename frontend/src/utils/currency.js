/**
 * Format a numeric amount using site currency settings.
 * @param {number|string} amount
 * @param {{ currencyCode?: string, currencySymbol?: string }} settings
 * @param {string} locale
 * @returns {string}
 */
export const formatCurrency = (amount, settings = {}, locale = "en-US") => {
    const value = Number(amount || 0);
    const currencyCode = String(settings?.currencyCode || "USD").toUpperCase();
    const currencySymbol = settings?.currencySymbol || "$";

    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    } catch {
        return `${currencySymbol}${value.toFixed(2)}`;
    }
};

