const rateLimitMap = new Map();

export const rateLimit = (maxRequests = 100, windowMinutes = 15) => {
    return (req, res, next) => {
        const identifier = req.ip || req.connection.remoteAddress;
        const windowMs = windowMinutes * 60 * 1000;
        const now = Date.now();

        // Clean up old entries
        for (const [key, data] of rateLimitMap.entries()) {
            if (now - data.firstRequest > windowMs) {
                rateLimitMap.delete(key);
            }
        }

        // Get current limit data
        const currentData = rateLimitMap.get(identifier) || {
            count: 0,
            firstRequest: now
        };

        // Check if window has reset
        if (now - currentData.firstRequest > windowMs) {
            currentData.count = 0;
            currentData.firstRequest = now;
        }

        // Check rate limit
        if (currentData.count >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil((windowMs - (now - currentData.firstRequest)) / 1000)
            });
        }

        // Increment counter
        currentData.count++;
        rateLimitMap.set(identifier, currentData);

        // Set headers
        res.set({
            'X-RateLimit-Limit': maxRequests,
            'X-RateLimit-Remaining': Math.max(0, maxRequests - currentData.count),
            'X-RateLimit-Reset': new Date(currentData.firstRequest + windowMs).getTime()
        });

        next();
    };
};