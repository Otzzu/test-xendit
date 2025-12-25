import { CyberSourceSimulator } from '../../infrastructure/gateways/cybersource.simulator';
import { InMemoryAccountRepository } from '../../infrastructure/persistance/account.repository.memory';
import { db } from '../../infrastructure/persistance/memory-db';
import { InMemoryTransactionRepository } from '../../infrastructure/persistance/transaction.repository.memory';

import { AccountService } from '../../modules/account/account.service';
import { TransactionService } from '../../modules/transaction/transaction.service';

import { flushMicrotasks } from '../test-utils';

describe('TransactionService (service-level)', () => {
    beforeEach(() => {
        db.clear();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('authorizes immediately, settles asynchronously, then updates balance asynchronously', async () => {
        // Arrange
        const txRepo = new InMemoryTransactionRepository();
        const accRepo = new InMemoryAccountRepository();
        const accountService = new AccountService(accRepo);

        // Expect: settlement delay = 20000ms
        const gateway = new CyberSourceSimulator(20000, 'ALWAYS_OK');

        const txService = new TransactionService(txRepo, gateway, accountService);

        // Act: authorize
        const tx = txService.authorizeTransaction(1, 1000);

        // Assert: authorized immediately
        expect(tx.status).toBe('AUTHORIZED');

        // Balance should NOT change on authorize
        expect(accountService.getAccount(1).balance).toBe(0);

        // Act: settlement runs in background (fire-and-forget)
        void txService.settleTransaction(tx.id);

        // Immediately still authorized
        expect(txService.getTransaction(tx.id).status).toBe('AUTHORIZED');

        // Advance time for settlement
        jest.advanceTimersByTime(20000);
        await flushMicrotasks();

        // Now settled
        expect(txService.getTransaction(tx.id).status).toBe('SETTLED');

        // Advance time for balance update async (5000ms ledger delay)
        jest.advanceTimersByTime(5000);
        await flushMicrotasks();

        // Balance credited
        expect(accountService.getAccount(1).balance).toBe(1000);
    });

    it('is idempotent: settling an already SETTLED transaction does not double-credit balance', async () => {
        const txRepo = new InMemoryTransactionRepository();
        const accRepo = new InMemoryAccountRepository();
        const accountService = new AccountService(accRepo);
        const gateway = new CyberSourceSimulator(20000, 'ALWAYS_OK');
        const txService = new TransactionService(txRepo, gateway, accountService);

        const tx = txService.authorizeTransaction(1, 1000);

        void txService.settleTransaction(tx.id);
        jest.advanceTimersByTime(20000);
        await flushMicrotasks();
        jest.advanceTimersByTime(5000);
        await flushMicrotasks();

        expect(txService.getTransaction(tx.id).status).toBe('SETTLED');
        expect(accountService.getAccount(1).balance).toBe(1000);

        // settle again
        void txService.settleTransaction(tx.id);
        jest.advanceTimersByTime(20000);
        await flushMicrotasks();
        jest.advanceTimersByTime(5000);
        await flushMicrotasks();

        // still 1000
        expect(accountService.getAccount(1).balance).toBe(1000);
    });

    it('handles gateway failure by marking transaction as FAILED', async () => {
        const txRepo = new InMemoryTransactionRepository();
        const accRepo = new InMemoryAccountRepository();
        const accountService = new AccountService(accRepo);
        // Simulate failure
        const gateway = new CyberSourceSimulator(100, 'ALWAYS_FAIL');
        const txService = new TransactionService(txRepo, gateway, accountService);

        const tx = txService.authorizeTransaction(1, 1000);

        void txService.settleTransaction(tx.id);

        jest.advanceTimersByTime(100);
        await flushMicrotasks();

        const updated = txService.getTransaction(tx.id);
        expect(updated.status).toBe('FAILED');
        expect(updated.failureReason).toContain('failed');

        // Balance NOT credited
        expect(accountService.getAccount(1).balance).toBe(0);
    });

    it('throws 404 for non-existent transaction', async () => {
        const txRepo = new InMemoryTransactionRepository();
        const accRepo = new InMemoryAccountRepository();
        const accountService = new AccountService(accRepo);
        const gateway = new CyberSourceSimulator(100, 'ALWAYS_OK');
        const txService = new TransactionService(txRepo, gateway, accountService);

        await expect(txService.settleTransaction(999)).rejects.toThrow('Transaction not found');
    });

    it('throws 409 if transaction has no authId', async () => {
        const txRepo = new InMemoryTransactionRepository();
        const accRepo = new InMemoryAccountRepository();
        const accountService = new AccountService(accRepo);
        const gateway = new CyberSourceSimulator(100, 'ALWAYS_OK');
        const txService = new TransactionService(txRepo, gateway, accountService);

        const tx = txRepo.save({
            accountId: 1,
            amount: 100,
            status: 'AUTHORIZED', // but NO authId
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        await expect(txService.settleTransaction(tx.id)).rejects.toThrow('Missing auth reference');
    });

    it('is idempotent for FAILED transactions', async () => {
        const txRepo = new InMemoryTransactionRepository();
        const accRepo = new InMemoryAccountRepository();
        const accountService = new AccountService(accRepo);
        const gateway = new CyberSourceSimulator(100, 'ALWAYS_OK');
        const txService = new TransactionService(txRepo, gateway, accountService);

        const tx = txRepo.save({
            accountId: 1,
            amount: 100,
            status: 'FAILED',
            authId: 'auth_123',
            failureReason: 'Previously failed',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // Settle should do nothing (no validation error, no gateway call)
        await txService.settleTransaction(tx.id);

        // Nothing changes
        const check = txService.getTransaction(tx.id);
        expect(check.status).toBe('FAILED');
        expect(check.failureReason).toBe('Previously failed');
    });
});
