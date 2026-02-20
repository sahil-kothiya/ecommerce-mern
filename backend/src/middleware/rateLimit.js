const rateLimitMap = new Map();

export const rateLimit = (maxRequests = 100, windowMinutes = 15) => {
    return (req, res, next) => {
        const identifier = req.ip || req.connection.remoteAddress;
        const windowMs = windowMinutes * 60 * 1000;
        const now = Date.now();

                for (const [key, data] of rateLimitMap.entries()) {
            if (now - data.firstRequest > windowMs) {
                rateLimitMap.delete(key);
            }
        }

                const currentData = rateLimitMap.get(identifier) || {
            count: 0,
            firstRequest: now
        };

                if (now - currentData.firstRequest > windowMs) {
            currentData.count = 0;
            currentData.firstRequest = now;
        }

                if (currentData.count >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil((windowMs - (now - currentData.firstRequest)) / 1000)
            });
        }

                currentData.count++;
        rateLimitMap.set(identifier, currentData);

                res.set({
            'X-RateLimit-Limit': maxRequests,
            'X-RateLimit-Remaining': Math.max(0, maxRequests - currentData.count),
            'X-RateLimit-Reset': new Date(currentData.firstRequest + windowMs).getTime()
        });

        next();
    };
};