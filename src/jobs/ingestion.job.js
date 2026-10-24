const { Queue, Worker } = require('bullmq');
const env = require('../config/env');
const logger = require('../config/logger');
const ingestionPipeline = require('../pipelines/ingestion.pipeline');

const QUEUE_NAME = 'document-ingestion-queue';

let ingestionQueue = null;
let ingestionWorker = null;

if (env.ENABLE_REDIS_QUEUE) {
  try {
    ingestionQueue = new Queue(QUEUE_NAME, {
      connection: {
        url: env.REDIS_URL
      }
    });

    ingestionWorker = new Worker(
      QUEUE_NAME,
      async (job) => {
        logger.info({ jobId: job.id, data: job.data }, 'Processing document ingestion job from queue');
        const { documentId, options } = job.data;
        return await ingestionPipeline.processDocument(documentId, options);
      },
      {
        connection: {
          url: env.REDIS_URL
        },
        concurrency: 3
      }
    );

    ingestionWorker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Ingestion job completed successfully');
    });

    ingestionWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'Ingestion job failed in queue');
    });
  } catch (err) {
    logger.warn({ err }, 'Redis queue initialization skipped or failed, using synchronous pipeline');
  }
}

const addIngestionJob = async (documentId, options = {}) => {
  if (ingestionQueue) {
    return await ingestionQueue.add('process-document', { documentId, options });
  } else {
    // Immediate execution fallback
    return await ingestionPipeline.processDocument(documentId, options);
  }
};

module.exports = {
  ingestionQueue,
  ingestionWorker,
  addIngestionJob
};
