import './ratingsQueue.js';
import './emailQueue.js';
import { logger } from '../utils/logger.js';

logger.info('Queue worker started');
logger.info('Listening for jobs on: product-ratings, emails');

process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing queue workers');
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing queue workers');
    process.exit(0);
});
