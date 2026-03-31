import { emailQueue } from "./index.js";
import { logger } from "../utils/logger.js";
import { emailService } from "../utils/emailService.js";

emailQueue.process(async (job) => {
  const { to, subject, html, text } = job.data;

  try {
    logger.info(`Sending email to: ${to}, subject: ${subject}`);

    const info = await emailService.sendMail({ to, subject, html, text });

    logger.info(`Email sent successfully to: ${to}`, {
      messageId: info.messageId,
    });

    return {
      success: true,
      to,
      subject,
      messageId: info.messageId,
      sentAt: new Date(),
    };
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
});

export const queueEmail = async (emailData) => {
  try {
    await emailQueue.add(emailData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 50,
      removeOnFail: false,
    });

    logger.info(`Queued email to: ${emailData.to}`);
  } catch (error) {
    logger.error(`Failed to queue email:`, error);
  }
};

emailQueue.on("completed", (job, result) => {
  logger.info(`Email sent successfully: ${result.to}`);
});

emailQueue.on("failed", (job, error) => {
  logger.error(`Email failed for job ${job.id}:`, error.message);
});

export default emailQueue;
