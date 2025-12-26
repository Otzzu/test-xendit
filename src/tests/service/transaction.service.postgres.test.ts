import { CyberSourceSimulator, WebhookPayload } from '../../infrastructure/gateways/cybersource.simulator';
import { PostgresAccountRepository } from '../../infrastructure/persistance/postgres/account.repository.postgres';
import { PostgresTransactionRepository } from '../../infrastructure/persistance/postgres/transaction.repository.postgres';
import { prisma } from '../../infrastructure/persistance/postgres/prisma';

import { AccountService } from '../../modules/account/account.service';
import { TransactionService } from '../../modules/transaction/transaction.service';

// Mock queueCreditBalance to avoid Redis dependency in tests
jest.mock('../../infrastructure/queue', () => ({
    queueCreditBalance: jest.fn().mockResolvedValue(undefined),
}));

import { queueCreditBalance } from '../../infrastructure/queue';

// Skip tests if DATABASE_URL is not set (running in CI without DB)
const describeIfPostgres = process.env.DATABASE_URL ? describe : describe.skip;

describeIfPostgres('TransactionService (PostgreSQL integration)', () => {
    let txRepo: PostgresTransactionRepository;
    let accRepo: PostgresAccountRepository;

    beforeAll(async () => {
        await prisma.$connect();
    }, 30000);

    afterAll(async () => {
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        // Clean up transactions
        await prisma.transaction.deleteMany({});

        // Reset/Seed accounts to ensure they exist and have 0 balance
        const accounts = [1, 2, 3];
        for (const id of accounts) {
            await prisma.account.upsert({
                where: { id },
                update: { balance: 0 },
                create: { id, balance: 0 }
            });
        }

        txRepo = new PostgresTransactionRepository(prisma);
        accRepo = new PostgresAccountRepository(prisma);
    }, 10000);

    describe('authorizeTransaction', () => {
        it('authorizes immediately and stores in database', async () => {
            const accountService = new AccountService(accRepo);
            // No webhook URL needed in tests - we'll call handleSettlementWebhook directly
            const gateway = new CyberSourceSimulator(5000, 'ALWAYS_OK', 0.1, 'http://test:3000');
            const txService = new TransactionService(txRepo, gateway, accountService);

            const tx = await txService.authorizeTransaction(1, 1000);

            expect(tx.status).toBe('AUTHORIZED');
            expect(tx.authId).toBeDefined();

            // Verify persisted in database
            const dbTx = await prisma.transaction.findUnique({ where: { id: tx.id } });
            expect(dbTx).not.toBeNull();
            expect(dbTx?.status).toBe('AUTHORIZED');
        }, 10000);
    });

    describe('handleSettlementWebhook', () => {
        it('updates transaction to SETTLED and queues balance credit', async () => {
            const accountService = new AccountService(accRepo);
            const gateway = new CyberSourceSimulator(5000, 'ALWAYS_OK', 0.1, 'http://test:3000');
            const txService = new TransactionService(txRepo, gateway, accountService);

            const tx = await txService.authorizeTransaction(1, 1000);

            const webhook: WebhookPayload = {
                authId: tx.authId!,
                settlementId: 'stl_123',
                status: 'SETTLED',
            };

            await txService.handleSettlementWebhook(webhook);

            const updated = await txService.getTransaction(tx.id);
            expect(updated.status).toBe('SETTLED');
            expect(updated.settlementId).toBe('stl_123');

            // Verify balance credit was queued
            expect(queueCreditBalance).toHaveBeenCalledWith(1, 1000);
        }, 10000);

        it('updates transaction to FAILED on failed webhook', async () => {
            const accountService = new AccountService(accRepo);
            const gateway = new CyberSourceSimulator(5000, 'ALWAYS_OK', 0.1, 'http://test:3000');
            const txService = new TransactionService(txRepo, gateway, accountService);

            const tx = await txService.authorizeTransaction(1, 1000);

            const webhook: WebhookPayload = {
                authId: tx.authId!,
                settlementId: '',
                status: 'FAILED',
                failureReason: 'Gateway timeout',
            };

            await txService.handleSettlementWebhook(webhook);

            const updated = await txService.getTransaction(tx.id);
            expect(updated.status).toBe('FAILED');
            expect(updated.failureReason).toBe('Gateway timeout');
            expect(queueCreditBalance).not.toHaveBeenCalled();
        }, 10000);

        it('is idempotent: ignores webhook for already SETTLED transaction', async () => {
            const accountService = new AccountService(accRepo);
            const gateway = new CyberSourceSimulator(5000, 'ALWAYS_OK', 0.1, 'http://test:3000');
            const txService = new TransactionService(txRepo, gateway, accountService);

            const tx = await txService.authorizeTransaction(1, 1000);

            const webhook: WebhookPayload = {
                authId: tx.authId!,
                settlementId: 'stl_123',
                status: 'SETTLED',
            };

            await txService.handleSettlementWebhook(webhook);
            await txService.handleSettlementWebhook(webhook); // Second call

            // Should only queue once
            expect(queueCreditBalance).toHaveBeenCalledTimes(1);
        }, 10000);

        it('finds transaction by authId correctly', async () => {
            const accountService = new AccountService(accRepo);
            const gateway = new CyberSourceSimulator(5000, 'ALWAYS_OK', 0.1, 'http://test:3000');
            const txService = new TransactionService(txRepo, gateway, accountService);

            // Create multiple transactions
            const tx1 = await txService.authorizeTransaction(1, 1000);
            const tx2 = await txService.authorizeTransaction(2, 2000);

            // Settle tx2 via webhook
            const webhook: WebhookPayload = {
                authId: tx2.authId!,
                settlementId: 'stl_456',
                status: 'SETTLED',
            };

            await txService.handleSettlementWebhook(webhook);

            // tx2 should be settled
            const updated2 = await txService.getTransaction(tx2.id);
            expect(updated2.status).toBe('SETTLED');

            // tx1 should still be authorized
            const updated1 = await txService.getTransaction(tx1.id);
            expect(updated1.status).toBe('AUTHORIZED');
        }, 10000);
    });

    describe('getTransaction', () => {
        it('throws 404 for non-existent transaction', async () => {
            const accountService = new AccountService(accRepo);
            const gateway = new CyberSourceSimulator(100, 'ALWAYS_OK', 0.1, 'http://test:3000');
            const txService = new TransactionService(txRepo, gateway, accountService);

            await expect(txService.getTransaction(99999)).rejects.toThrow('Transaction not found');
        }, 10000);
    });
});
