

export const formatPrice = (price, currency = 'USD', locale = 'en-US') => {
    if (typeof price !== 'number' || isNaN(price)) {
        price = 0;
    }

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    } catch (error) {
                console.warn('Intl.NumberFormat not supported, using fallback formatting');
        const symbol = currency === 'USD' ? '$' : currency;
        return `${symbol}${price.toFixed(2)}`;
    }
};

export const calculateDiscountPrice = (basePrice, discount) => {
    if (typeof basePrice !== 'number' || isNaN(basePrice)) {
        basePrice = 0;
    }

    if (typeof discount !== 'number' || isNaN(discount)) {
        discount = 0;
    }

        discount = Math.max(0, Math.min(100, discount));

    if (discount === 0) {
        return basePrice;
    }

    const discountAmount = (basePrice * discount) / 100;
    const finalPrice = basePrice - discountAmount;

        return Math.round(finalPrice * 100) / 100;
};

export const calculateDiscountPercentage = (originalPrice, discountedPrice) => {
    if (originalPrice <= 0 || discountedPrice >= originalPrice) {
        return 0;
    }

    const difference = originalPrice - discountedPrice;
    const percentage = (difference / originalPrice) * 100;

    return Math.round(percentage * 100) / 100;
};

export const formatDiscountLabel = (discount) => {
    if (!discount || discount <= 0) {
        return '';
    }

    return `${Math.round(discount)}% OFF`;
};

export const calculateSavings = (basePrice, discount) => {
    if (!basePrice || !discount) {
        return 0;
    }

    const discountedPrice = calculateDiscountPrice(basePrice, discount);
    return Math.round((basePrice - discountedPrice) * 100) / 100;
};

export const hasDiscount = (discount) => {
    return typeof discount === 'number' && discount > 0;
};

export const getPriceRange = (variants) => {
    if (!Array.isArray(variants) || variants.length === 0) {
        return { min: 0, max: 0 };
    }

    const prices = variants
        .map(variant => variant.price || variant.basePrice || 0)
        .filter(price => price > 0);

    if (prices.length === 0) {
        return { min: 0, max: 0 };
    }

    return {
        min: Math.min(...prices),
        max: Math.max(...prices)
    };
};

export const formatPriceRange = (minPrice, maxPrice, currency = 'USD', locale = 'en-US') => {
    if (minPrice === maxPrice) {
        return formatPrice(minPrice, currency, locale);
    }

    const formattedMin = formatPrice(minPrice, currency, locale);
    const formattedMax = formatPrice(maxPrice, currency, locale);

    return `${formattedMin} - ${formattedMax}`;
};

export const isValidPrice = (price) => {
    return typeof price === 'number' && !isNaN(price) && price >= 0;
};

export const calculateTax = (price, taxRate = 0) => {
    if (!isValidPrice(price) || taxRate < 0) {
        return 0;
    }

    return Math.round((price * taxRate / 100) * 100) / 100;
};

export const calculatePriceWithTax = (price, taxRate = 0) => {
    const taxAmount = calculateTax(price, taxRate);
    return Math.round((price + taxAmount) * 100) / 100;
};

export default {
    formatPrice,
    calculateDiscountPrice,
    calculateDiscountPercentage,
    formatDiscountLabel,
    calculateSavings,
    hasDiscount,
    getPriceRange,
    formatPriceRange,
    isValidPrice,
    calculateTax,
    calculatePriceWithTax
};
