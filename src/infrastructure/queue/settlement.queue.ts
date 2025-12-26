import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export interface CreditBalanceJobData {
    accountId: number;
    amount: number;
}

export const creditBalanceQueue = new Queue<CreditBalanceJobData>('credit-balance', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

export async function queueCreditBalance(accountId: number, amount: number): Promise<void> {
    await creditBalanceQueue.add('credit', { accountId, amount });
}

export { connection as redisConnection };
