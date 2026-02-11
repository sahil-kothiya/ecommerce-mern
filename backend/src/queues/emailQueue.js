import { emailQueue } from './index.js';
import { logger } from '../utils/logger.js';

emailQueue.process(async (job) => {
    const { to, subject, template, data } = job.data;
    
    try {
        logger.info(`Sending email to: ${to}, subject: ${subject}`);
        
        // TODO: Implement email service (Nodemailer, SendGrid, etc.)
        // For now, just log the email details
        
        logger.info(`Email sent successfully to: ${to}`);
        
        return {
            success: true,
            to,
            subject,
            sentAt: new Date()
        };
        
    } catch (error) {
        logger.error(`Failed to send email to ${to}:`, error);
        throw error;
    }
});

export const queueEmail = async (emailData) => {
    try {
        await emailQueue.add(
            emailData,
            {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                },
                removeOnComplete: 50,
                removeOnFail: false
            }
        );
        
        logger.info(`Queued email to: ${emailData.to}`);
    } catch (error) {
        logger.error(`Failed to queue email:`, error);
    }
};

emailQueue.on('completed', (job, result) => {
    logger.info(`Email sent successfully: ${result.to}`);
});

emailQueue.on('failed', (job, error) => {
    logger.error(`Email failed for job ${job.id}:`, error.message);
});

export default emailQueue;
