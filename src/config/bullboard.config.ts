import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bull';
import logger from './logger.config';

/**
 * Bull Board configuration for queue monitoring
 * 
 * Provides a web UI for monitoring Bull queues at /admin/queues
 * Should be protected by admin authentication middleware
 * 
 * Requirements: 10.7
 */

let serverAdapter: ExpressAdapter | null = null;

/**
 * Initialize Bull Board with the provided queues
 * 
 * @param queues - Array of Bull queue instances to monitor
 * @returns Express adapter to mount in the application
 */
export function initializeBullBoard(queues: Queue[]): ExpressAdapter {
  if (queues.length === 0) {
    logger.warn('No queues provided to Bull Board');
  }

  // Create Express adapter for Bull Board
  serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  // Create Bull Board with queue adapters
  createBullBoard({
    queues: queues.map((queue) => new BullAdapter(queue)),
    serverAdapter: serverAdapter,
  });

  logger.info(`✅ Bull Board initialized with ${queues.length} queues`);

  return serverAdapter;
}

/**
 * Get the Bull Board server adapter
 * Must be called after initializeBullBoard
 */
export function getBullBoardAdapter(): ExpressAdapter {
  if (!serverAdapter) {
    throw new Error('Bull Board not initialized. Call initializeBullBoard first.');
  }
  return serverAdapter;
}
