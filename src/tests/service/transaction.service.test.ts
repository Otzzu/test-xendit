import { CyberSourceSimulator, WebhookPayload } from '../../infrastructure/gateways/cybersource.simulator';
import { InMemoryAccountRepository } from '../../infrastructure/persistance/memory/account.repository.memory';
import { db } from '../../infrastructure/persistance/memory/memory-db';
import { InMemoryTransactionRepository } from '../../infrastructure/persistance/memory/transaction.repository.memory';

import { AccountService } from '../../modules/account/account.service';
import { TransactionService } from '../../modules/transaction/transaction.service';

// Mock queueCreditBalance to avoid Redis dependency in tests
jest.mock('../../infrastructure/queue', () => ({
    queueCreditBalance: jest.fn().mockResolvedValue(undefined),
}));

import { queueCreditBalance } from '../../infrastructure/queue';

describe('TransactionService (service-level)', () => {
    beforeEach(() => {
        db.clear();
        jest.clearAllMocks();
    });

    describe('authorizeTransaction', () => {
        it('authorizes immediately and returns AUTHORIZED status', async () => {
            const txRepo = new InMemoryTransactionRepository();
            const accRepo = new InMemoryAccountRepository();
            const accountService = new AccountService(accRepo);
            const gateway = new CyberSourceSimulator(5000, 'ALWAYS_OK');
            const txService = new TransactionService(txRepo, gateway, accountService);

            const tx = await txService.authorizeTransaction(1, 1000);

            expect(tx.status).toBe('AUTHORIZED');
            expect(tx.authId).toBeDefined();
            expect(tx.accountId).toBe(1);
            expect(tx.amount).toBe(1000);
        });

        it('creates account if not exists', async () => {
            const txRepo = new InMemoryTransactionRepository();
            const accRepo = new InMemoryAccountRepository();
            const accountService = new AccountService(accRepo);
            const gateway = new CyberSourceSimulator(5000, 'ALWAYS_OK');
            const txService = new TransactionService(txRepo, gateway, accountService);

            await txService.authorizeTransaction(1, 1000);

            const account = await accountService.getAccount(1);
            expect(account.id).toBe(1);
            expect(account.balance).toBe(0); // Not credited on authorize
        });
    });

    describe('handleSettlementWebhook', () => {
        it('updates transaction to SETTLED and queues balance credit', async () => {
            const txRepo = new InMemoryTransactionRepository();
            const accRepo = new InMemoryAccountRepository();
            const accountService = new AccountService(accRepo);
            const gateway = new CyberSourceSimulator(5000, 'ALWAYS_OK');
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
            expect(queueCreditBalance).toHaveBeenCalledWith(1, 1000);
        });

        it('updates transaction to FAILED on failed webhook', async () => {
            const txRepo = new InMemoryTransactionRepository();
            const accRepo = new InMemoryAccountRepository();
            const accountService = new AccountService(accRepo);
            const gateway = new CyberSourceSimulator(5000, 'ALWAYS_OK');
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
        });

        it('is idempotent: ignores webhook for already SETTLED transaction', async () => {
            const txRepo = new InMemoryTransactionRepository();
            const accRepo = new InMemoryAccountRepository();
            const accountService = new AccountService(accRepo);
            const gateway = new CyberSourceSimulator(5000, 'ALWAYS_OK');
            const txService = new TransactionService(txRepo, gateway, accountService);

            const tx = await txService.authorizeTransaction(1, 1000);

            const webhook: WebhookPayload = {
                authId: tx.authId!,
                settlementId: 'stl_123',
                status: 'SETTLED',
            };

            await txService.handleSettlementWebhook(webhook);
            await txService.handleSettlementWebhook(webhook); // Second call

            expect(queueCreditBalance).toHaveBeenCalledTimes(1); // Only once
        });

        it('ignores webhook for unknown authId', async () => {
            const txRepo = new InMemoryTransactionRepository();
            const accRepo = new InMemoryAccountRepository();
            const accountService = new AccountService(accRepo);
            const gateway = new CyberSourceSimulator(5000, 'ALWAYS_OK');
            const txService = new TransactionService(txRepo, gateway, accountService);

            const webhook: WebhookPayload = {
                authId: 'unknown_auth_id',
                settlementId: 'stl_123',
                status: 'SETTLED',
            };

            // Should not throw, just log and return
            await expect(txService.handleSettlementWebhook(webhook)).resolves.toBeUndefined();
            expect(queueCreditBalance).not.toHaveBeenCalled();
        });
        it('handles concurrent webhooks safely (race condition check)', async () => {
            const txRepo = new InMemoryTransactionRepository();
            const accRepo = new InMemoryAccountRepository();
            const accountService = new AccountService(accRepo);
            const gateway = new CyberSourceSimulator(100);
            const txService = new TransactionService(txRepo, gateway, accountService);

            const tx = await txService.authorizeTransaction(1, 1000);
            const webhook: WebhookPayload = {
                authId: tx.authId!,
                settlementId: 'stl_race',
                status: 'SETTLED',
            };

            // Fire mixed duplicates concurrently
            await Promise.all([
                txService.handleSettlementWebhook(webhook),
                txService.handleSettlementWebhook(webhook),
                txService.handleSettlementWebhook(webhook)
            ]);

            // Database should still be consistent (Queue called only once)
            expect(queueCreditBalance).toHaveBeenCalledTimes(1);
        });
    });

    describe('getTransaction', () => {
        it('throws 404 for non-existent transaction', async () => {
            const txRepo = new InMemoryTransactionRepository();
            const accRepo = new InMemoryAccountRepository();
            const accountService = new AccountService(accRepo);
            const gateway = new CyberSourceSimulator(100, 'ALWAYS_OK');
            const txService = new TransactionService(txRepo, gateway, accountService);

            await expect(txService.getTransaction(999)).rejects.toThrow('Transaction not found');
        });
    });
});
