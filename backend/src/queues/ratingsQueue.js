import { ratingsQueue } from './index.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { logger } from '../utils/logger.js';

ratingsQueue.process(async (job) => {
    const { productId } = job.data;
    
    try {
        logger.info(`Processing rating update for product: ${productId}`);
        
        const reviews = await Review.find({
            productId,
            status: 'active'
        }).lean();
        
        if (reviews.length === 0) {
            await Product.findByIdAndUpdate(
                productId,
                {
                    'ratings.average': 0,
                    'ratings.count': 0,
                    'ratings.distribution': { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                },
                { timestamps: false }
            );
            return { success: true, count: 0 };
        }
        
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const average = Math.round((totalRating / reviews.length) * 10) / 10;
        
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach(review => {
            distribution[review.rating]++;
        });
        
        await Product.findByIdAndUpdate(
            productId,
            {
                'ratings.average': average,
                'ratings.count': reviews.length,
                'ratings.distribution': distribution
            },
            { timestamps: false }
        );
        
        logger.info(`Rating updated for product ${productId}: ${average} (${reviews.length} reviews)`);
        
        return {
            success: true,
            productId,
            average,
            count: reviews.length
        };
        
    } catch (error) {
        logger.error(`Failed to update ratings for product ${productId}:`, error);
        throw error;
    }
});

export const queueRatingUpdate = async (productId) => {
    try {
        await ratingsQueue.add(
            { productId: productId.toString() },
            {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                },
                removeOnComplete: 100,
                removeOnFail: false
            }
        );
        
        logger.info(`Queued rating update for product: ${productId}`);
    } catch (error) {
        logger.error(`Failed to queue rating update for product ${productId}:`, error);
    }
};

ratingsQueue.on('completed', (job, result) => {
    logger.info(`Rating update completed: ${JSON.stringify(result)}`);
});

ratingsQueue.on('failed', (job, error) => {
    logger.error(`Rating update failed for job ${job.id}:`, error.message);
});

export default ratingsQueue;
