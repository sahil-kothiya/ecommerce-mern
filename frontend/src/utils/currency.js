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
