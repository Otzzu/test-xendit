import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { CreditBalanceJobData } from './settlement.queue';
import { AccountService } from '../../modules/account/account.service';

let worker: Worker | null = null;

export function startCreditBalanceWorker(accountService: AccountService): Worker {
    const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
    });

    worker = new Worker<CreditBalanceJobData>(
        'credit-balance',
        async (job: Job<CreditBalanceJobData>) => {
            const { accountId, amount } = job.data;
            console.log(`[Worker] Processing credit balance for account ${accountId}, amount ${amount}`);
            await accountService.credit(accountId, amount);
            console.log(`[Worker] Credit balance completed for account ${accountId}`);
        },
        { connection, concurrency: 5 }
    );

    worker.on('completed', (job) => {
        console.log(`[Worker] Job ${job.id} completed for account ${job.data.accountId}`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[Worker] Job ${job?.id} failed for account ${job?.data.accountId}: ${err.message}`);
    });

    console.log('[Worker] Credit balance worker started');
    return worker;
}

export async function stopCreditBalanceWorker(): Promise<void> {
    if (worker) {
        await worker.close();
        worker = null;
        console.log('[Worker] Credit balance worker stopped');
    }
}

export { worker };
