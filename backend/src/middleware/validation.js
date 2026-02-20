export const validateRequest = (validationType) => {
    return (req, res, next) => {
        const errors = [];

        switch (validationType) {
            case 'createProduct':
                if (!req.body.title) errors.push('Title is required');
                if (!req.body.summary) errors.push('Summary is required');
                if (req.body.hasVariants && (!req.body.variants || req.body.variants.length === 0)) {
                    errors.push('At least one variant is required for variant products');
                }
                if (!req.body.hasVariants) {
                    if (!req.body.basePrice) errors.push('Base price is required for non-variant products');
                    if (!req.body.baseSku) errors.push('Base SKU is required for non-variant products');
                    if (req.body.baseStock === undefined) errors.push('Base stock is required for non-variant products');
                }
                break;

            case 'updateProduct':
                                if (req.body.hasVariants && req.body.variants && req.body.variants.length === 0) {
                    errors.push('At least one variant is required for variant products');
                }
                break;

            case 'createCategory':
                if (!req.body.title) errors.push('Title is required');
                break;

            case 'updateCategory':
                                break;

            case 'addToCart':
                if (!req.body.productId) errors.push('Product ID is required');
                if (req.body.quantity && req.body.quantity <= 0) {
                    errors.push('Quantity must be greater than 0');
                }
                break;

            case 'updateCartItem':
                if (!req.body.quantity || req.body.quantity <= 0) {
                    errors.push('Valid quantity is required');
                }
                break;

            case 'applyCoupon':
                if (!req.body.couponCode) errors.push('Coupon code is required');
                break;

            case 'createOrder':
                if (!req.body.shippingAddress) errors.push('Shipping address is required');
                if (!req.body.paymentMethod) errors.push('Payment method is required');

                                if (req.body.shippingAddress) {
                    const addr = req.body.shippingAddress;
                    if (!addr.firstName) errors.push('Shipping first name is required');
                    if (!addr.lastName) errors.push('Shipping last name is required');
                    if (!addr.address1) errors.push('Shipping address is required');
                    if (!addr.city) errors.push('Shipping city is required');
                    if (!addr.state) errors.push('Shipping state is required');
                    if (!addr.zipCode) errors.push('Shipping zip code is required');
                    if (!addr.country) errors.push('Shipping country is required');
                }
                break;

            case 'cancelOrder':
                                break;

            case 'updateOrderStatus':
                if (!req.body.status) errors.push('Status is required');

                const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
                if (req.body.status && !validStatuses.includes(req.body.status)) {
                    errors.push('Invalid order status');
                }
                break;

            case 'updateShipping':
                if (!req.body.carrier) errors.push('Carrier is required');
                if (!req.body.trackingNumber) errors.push('Tracking number is required');
                break;

            default:
                                break;
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        next();
    };
};