import { config } from './config/index.js';
import { connectDB } from './config/database.js';
import { logger } from './utils/logger.js';
import app from './app.js';

const PORT = config.port || 5001;

const startServer = async () => {
    try {
                await connectDB();
        logger.info('✅ MongoDB connected successfully');

                app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT} in ${config.nodeEnv} mode`);
            logger.info(`📡 API available at ${config.apiUrl}`);
        });
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! Shutting down...', err);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
    process.exit(1);
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

startServer();

export default app;
