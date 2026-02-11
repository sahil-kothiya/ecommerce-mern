import Queue from 'bull';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3
};

export const ratingsQueue = new Queue('product-ratings', { redis: redisConfig });
export const emailQueue = new Queue('emails', { redis: redisConfig });
export const imageProcessingQueue = new Queue('image-processing', { redis: redisConfig });

ratingsQueue.on('error', (error) => {
    logger.error('Ratings queue error:', error);
});

emailQueue.on('error', (error) => {
    logger.error('Email queue error:', error);
});

imageProcessingQueue.on('error', (error) => {
    logger.error('Image processing queue error:', error);
});

logger.info('Queue system initialized');
