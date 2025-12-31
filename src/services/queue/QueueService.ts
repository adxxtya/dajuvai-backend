import Bull, { Queue, Job } from 'bull';
import { getRedisClient } from '../../config/redis.config';
import logger from '../../config/logger.config';

/**
 * Job data interfaces for different queue types
 */
export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data: any;
}

export interface ImageJobData {
  imageUrl: string;
  operations: string[];
}

export interface NotificationJobData {
  userId: number;
  title: string;
  message: string;
  type: string;
}

/**
 * QueueService manages background job processing using Bull
 * 
 * This service provides three queues:
 * - emailQueue: For sending emails asynchronously
 * - imageQueue: For processing and optimizing images
 * - notificationQueue: For sending push notifications
 * 
 * Each queue has configured retry logic with exponential backoff
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4
 */
export class QueueService {
  private emailQueue: Queue<EmailJobData>;
  private imageQueue: Queue<ImageJobData>;
  private notificationQueue: Queue<NotificationJobData>;

  constructor() {
    const redisClient = getRedisClient();

    if (!redisClient) {
      logger.warn('QueueService initialized without Redis. Background jobs will be disabled.');
      // Create dummy queues that won't process anything
      this.emailQueue = null as any;
      this.imageQueue = null as any;
      this.notificationQueue = null as any;
      return;
    }

    // Initialize queues with Redis connection
    const redisOptions = {
      redis: {
        host: redisClient.options.host,
        port: redisClient.options.port,
        password: redisClient.options.password,
      },
    };

    this.emailQueue = new Bull<EmailJobData>('email', redisOptions);
    this.imageQueue = new Bull<ImageJobData>('image', redisOptions);
    this.notificationQueue = new Bull<NotificationJobData>('notification', redisOptions);

    // Set up queue processors
    this.setupEmailProcessor();
    this.setupImageProcessor();
    this.setupNotificationProcessor();

    // Set up event listeners
    this.setupEventListeners();

    logger.info('✅ QueueService initialized with Bull queues');
  }

  /**
   * Set up email queue processor
   */
  private setupEmailProcessor(): void {
    this.emailQueue.process(async (job: Job<EmailJobData>) => {
      logger.info(`Processing email job ${job.id}`, { data: job.data });

      try {
        // TODO: Import and call EmailService.send when implemented
        // For now, just log the email data
        logger.info('Email job processed (EmailService not yet implemented)', {
          to: job.data.to,
          subject: job.data.subject,
        });

        return { success: true };
      } catch (error) {
        logger.error(`Email job ${job.id} failed:`, error);
        throw error; // Re-throw to trigger retry
      }
    });
  }

  /**
   * Set up image queue processor
   */
  private setupImageProcessor(): void {
    this.imageQueue.process(async (job: Job<ImageJobData>) => {
      logger.info(`Processing image job ${job.id}`, { data: job.data });

      try {
        // TODO: Import and call ImageOptimizationService.process when implemented
        // For now, just log the image data
        logger.info('Image job processed (ImageOptimizationService not yet implemented)', {
          imageUrl: job.data.imageUrl,
        });

        return { success: true };
      } catch (error) {
        logger.error(`Image job ${job.id} failed:`, error);
        throw error; // Re-throw to trigger retry
      }
    });
  }

  /**
   * Set up notification queue processor
   */
  private setupNotificationProcessor(): void {
    this.notificationQueue.process(async (job: Job<NotificationJobData>) => {
      logger.info(`Processing notification job ${job.id}`, { data: job.data });

      try {
        // TODO: Import and call NotificationService.send when implemented
        // For now, just log the notification data
        logger.info('Notification job processed (NotificationService not yet implemented)', {
          userId: job.data.userId,
          title: job.data.title,
        });

        return { success: true };
      } catch (error) {
        logger.error(`Notification job ${job.id} failed:`, error);
        throw error; // Re-throw to trigger retry
      }
    });
  }

  /**
   * Set up event listeners for all queues
   */
  private setupEventListeners(): void {
    // Email queue events
    this.emailQueue.on('completed', (job: Job) => {
      logger.info(`Email job ${job.id} completed successfully`);
    });

    this.emailQueue.on('failed', (job: Job, err: Error) => {
      logger.error(`Email job ${job.id} failed after all retries:`, {
        error: err.message,
        data: job.data,
      });
    });

    // Image queue events
    this.imageQueue.on('completed', (job: Job) => {
      logger.info(`Image job ${job.id} completed successfully`);
    });

    this.imageQueue.on('failed', (job: Job, err: Error) => {
      logger.error(`Image job ${job.id} failed after all retries:`, {
        error: err.message,
        data: job.data,
      });
    });

    // Notification queue events
    this.notificationQueue.on('completed', (job: Job) => {
      logger.info(`Notification job ${job.id} completed successfully`);
    });

    this.notificationQueue.on('failed', (job: Job, err: Error) => {
      logger.error(`Notification job ${job.id} failed after all retries:`, {
        error: err.message,
        data: job.data,
      });
    });
  }

  /**
   * Add an email job to the queue
   * 
   * Configuration:
   * - Attempts: 3
   * - Backoff: exponential starting at 2000ms
   * - Timeout: 10000ms
   * 
   * Requirements: 10.1, 10.4, 18.5, 18.6, 18.8
   */
  async addEmailJob(data: EmailJobData): Promise<void> {
    if (!this.emailQueue) {
      logger.warn('Email queue not available, skipping job');
      return;
    }

    try {
      await this.emailQueue.add(data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        timeout: 10000,
        removeOnComplete: true,
        removeOnFail: false,
      });

      logger.debug('Email job added to queue', { to: data.to, subject: data.subject });
    } catch (error) {
      logger.error('Failed to add email job to queue:', error);
      throw error;
    }
  }

  /**
   * Add an image processing job to the queue
   * 
   * Configuration:
   * - Attempts: 2
   * - Backoff: exponential starting at 5000ms
   * - Timeout: 30000ms
   * 
   * Requirements: 10.1, 10.4, 18.5, 18.6, 18.8
   */
  async addImageProcessingJob(data: ImageJobData): Promise<void> {
    if (!this.imageQueue) {
      logger.warn('Image queue not available, skipping job');
      return;
    }

    try {
      await this.imageQueue.add(data, {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        timeout: 30000,
        removeOnComplete: true,
        removeOnFail: false,
      });

      logger.debug('Image processing job added to queue', { imageUrl: data.imageUrl });
    } catch (error) {
      logger.error('Failed to add image processing job to queue:', error);
      throw error;
    }
  }

  /**
   * Add a notification job to the queue
   * 
   * Configuration:
   * - Attempts: 5
   * - Backoff: exponential starting at 1000ms
   * - Timeout: 5000ms
   * 
   * Requirements: 10.1, 10.4, 18.5, 18.6, 18.8
   */
  async addNotificationJob(data: NotificationJobData): Promise<void> {
    if (!this.notificationQueue) {
      logger.warn('Notification queue not available, skipping job');
      return;
    }

    try {
      await this.notificationQueue.add(data, {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        timeout: 5000,
        removeOnComplete: true,
        removeOnFail: false,
      });

      logger.debug('Notification job added to queue', { userId: data.userId, title: data.title });
    } catch (error) {
      logger.error('Failed to add notification job to queue:', error);
      throw error;
    }
  }

  /**
   * Get queue instances for Bull Board monitoring
   */
  getQueues(): Queue[] {
    return [this.emailQueue, this.imageQueue, this.notificationQueue].filter(Boolean);
  }

  /**
   * Close all queues gracefully
   */
  async close(): Promise<void> {
    if (this.emailQueue) await this.emailQueue.close();
    if (this.imageQueue) await this.imageQueue.close();
    if (this.notificationQueue) await this.notificationQueue.close();
    logger.info('All queues closed');
  }
}
