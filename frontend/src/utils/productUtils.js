/**
 * Product Utility Functions
 * Following international coding standards for maintainability
 */

/**
 * Format price according to currency configuration
 * @param {number} price - The price to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted price string
 */
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
        // Fallback formatting if Intl is not supported
        console.warn('Intl.NumberFormat not supported, using fallback formatting');
        const symbol = currency === 'USD' ? '$' : currency;
        return `${symbol}${price.toFixed(2)}`;
    }
};

/**
 * Calculate discounted price
 * @param {number} basePrice - The original price
 * @param {number} discount - Discount percentage (0-100)
 * @returns {number} Calculated discounted price
 */
export const calculateDiscountPrice = (basePrice, discount) => {
    if (typeof basePrice !== 'number' || isNaN(basePrice)) {
        basePrice = 0;
    }

    if (typeof discount !== 'number' || isNaN(discount)) {
        discount = 0;
    }

    // Ensure discount is between 0 and 100
    discount = Math.max(0, Math.min(100, discount));

    if (discount === 0) {
        return basePrice;
    }

    const discountAmount = (basePrice * discount) / 100;
    const finalPrice = basePrice - discountAmount;

    // Round to 2 decimal places
    return Math.round(finalPrice * 100) / 100;
};

/**
 * Calculate discount percentage
 * @param {number} originalPrice - The original price
 * @param {number} discountedPrice - The discounted price
 * @returns {number} Discount percentage
 */
export const calculateDiscountPercentage = (originalPrice, discountedPrice) => {
    if (originalPrice <= 0 || discountedPrice >= originalPrice) {
        return 0;
    }

    const difference = originalPrice - discountedPrice;
    const percentage = (difference / originalPrice) * 100;

    return Math.round(percentage * 100) / 100;
};

/**
 * Format discount label
 * @param {number} discount - Discount percentage
 * @returns {string} Formatted discount label
 */
export const formatDiscountLabel = (discount) => {
    if (!discount || discount <= 0) {
        return '';
    }

    return `${Math.round(discount)}% OFF`;
};

/**
 * Calculate savings amount
 * @param {number} basePrice - The original price
 * @param {number} discount - Discount percentage
 * @returns {number} Amount saved
 */
export const calculateSavings = (basePrice, discount) => {
    if (!basePrice || !discount) {
        return 0;
    }

    const discountedPrice = calculateDiscountPrice(basePrice, discount);
    return Math.round((basePrice - discountedPrice) * 100) / 100;
};

/**
 * Check if product has discount
 * @param {number} discount - Discount percentage
 * @returns {boolean} True if product has discount
 */
export const hasDiscount = (discount) => {
    return typeof discount === 'number' && discount > 0;
};

/**
 * Get price range for a product with variants
 * @param {Array} variants - Array of product variants
 * @returns {Object} Price range with min and max
 */
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

/**
 * Format price range
 * @param {number} minPrice - Minimum price
 * @param {number} maxPrice - Maximum price
 * @param {string} currency - Currency code
 * @param {string} locale - Locale for formatting
 * @returns {string} Formatted price range
 */
export const formatPriceRange = (minPrice, maxPrice, currency = 'USD', locale = 'en-US') => {
    if (minPrice === maxPrice) {
        return formatPrice(minPrice, currency, locale);
    }

    const formattedMin = formatPrice(minPrice, currency, locale);
    const formattedMax = formatPrice(maxPrice, currency, locale);

    return `${formattedMin} - ${formattedMax}`;
};

/**
 * Validate product price
 * @param {number} price - Price to validate
 * @returns {boolean} True if price is valid
 */
export const isValidPrice = (price) => {
    return typeof price === 'number' && !isNaN(price) && price >= 0;
};

/**
 * Calculate tax amount
 * @param {number} price - Base price
 * @param {number} taxRate - Tax rate as percentage
 * @returns {number} Tax amount
 */
export const calculateTax = (price, taxRate = 0) => {
    if (!isValidPrice(price) || taxRate < 0) {
        return 0;
    }

    return Math.round((price * taxRate / 100) * 100) / 100;
};

/**
 * Calculate total price including tax
 * @param {number} price - Base price
 * @param {number} taxRate - Tax rate as percentage
 * @returns {number} Total price with tax
 */
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
