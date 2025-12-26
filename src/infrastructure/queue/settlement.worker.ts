import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { CreditBalanceJobData } from './settlement.queue';
import { AccountService } from '../../modules/account/account.service';
import { logger } from '../../shared/utils/logger';

let worker: Worker | null = null;

export function startCreditBalanceWorker(accountService: AccountService): Worker {
    const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
    });

    worker = new Worker<CreditBalanceJobData>(
        'credit-balance',
        async (job: Job<CreditBalanceJobData>) => {
            const { accountId, amount } = job.data;
            logger.info('Processing credit balance', { jobId: job.id, accountId, amount });
            await accountService.credit(accountId, amount);
            logger.info('Credit balance completed', { jobId: job.id, accountId, amount });
        },
        { connection, concurrency: 5 }
    );

    worker.on('completed', (job) => {
        logger.info('Job completed', { jobId: job.id, accountId: job.data.accountId });
    });

    worker.on('failed', (job, err) => {
        logger.error('Job failed', { jobId: job?.id, accountId: job?.data.accountId, error: err.message });
    });

    logger.info('Credit balance worker started');
    return worker;
}

export async function stopCreditBalanceWorker(): Promise<void> {
    if (worker) {
        await worker.close();
        worker = null;
        logger.info('Credit balance worker stopped');
    }
}

export { worker };
