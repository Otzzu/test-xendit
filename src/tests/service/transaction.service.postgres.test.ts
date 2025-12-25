import { CyberSourceSimulator } from '../../infrastructure/gateways/cybersource.simulator';
import { PostgresAccountRepository } from '../../infrastructure/persistance/postgres/account.repository.postgres';
import { PostgresTransactionRepository } from '../../infrastructure/persistance/postgres/transaction.repository.postgres';
import { prisma, pool } from '../../infrastructure/persistance/postgres/prisma';

import { AccountService } from '../../modules/account/account.service';
import { TransactionService } from '../../modules/transaction/transaction.service';

// Skip tests if DATABASE_URL is not set (running in CI without DB)
const describeIfPostgres = process.env.DATABASE_URL ? describe : describe.skip;

// Helper to wait for async operations (real time, not fake)
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    // Helper to track background promises
    // This allows us to explicitly await the background "fire-and-forget" tasks
    function trackBackgroundWork(service: AccountService) {
        const pending: Promise<any>[] = [];
        const original = service.creditAfterSettlement.bind(service);

        service.creditAfterSettlement = (id, amt) => {
            const p = original(id, amt);
            // Catch errors to prevent unhandled rejection noise in tests (handled in service logic anyway)
            const tracked = p.catch(err => console.error('Background task error:', err));
            pending.push(tracked);
            return p;
        };

        return {
            awaitAll: async () => Promise.all(pending)
        };
    }

    it('authorizes immediately, settles asynchronously, then updates balance', async () => {
        const accountService = new AccountService(accRepo);
        const tracker = trackBackgroundWork(accountService);

        // Very short delays for integration tests (10ms settlement, 10ms ledger)
        const gateway = new CyberSourceSimulator(10, 'ALWAYS_OK');
        const txService = new TransactionService(txRepo, gateway, accountService);

        // Act: authorize
        const tx = await txService.authorizeTransaction(1, 1000);

        // Assert: authorized immediately
        expect(tx.status).toBe('AUTHORIZED');

        // Balance should be 0 initially
        expect((await accountService.getAccount(1)).balance).toBe(0);

        // Act: settlement runs in background
        void txService.settleTransaction(tx.id);

        // Now settled 
        // We wait a bit for the sync part of settle to finish (status update)
        await wait(200);
        const settled = await txService.getTransaction(tx.id);
        expect(settled.status).toBe('SETTLED');

        // WAIT for background credit to finish strictly by promise
        await tracker.awaitAll();

        // Verify result
        const account = await accountService.getAccount(1);
        expect(account.balance).toBe(1000);
    }, 30000);

    it('is idempotent: settling an already SETTLED transaction does not double-credit', async () => {
        const accountService = new AccountService(accRepo);
        const tracker = trackBackgroundWork(accountService);

        const gateway = new CyberSourceSimulator(10, 'ALWAYS_OK');
        const txService = new TransactionService(txRepo, gateway, accountService);

        const tx = await txService.authorizeTransaction(1, 1000);

        // First settle
        await txService.settleTransaction(tx.id);

        expect((await txService.getTransaction(tx.id)).status).toBe('SETTLED');

        // settle again - should be no-op
        await txService.settleTransaction(tx.id);

        // Status still SETTLED
        expect((await txService.getTransaction(tx.id)).status).toBe('SETTLED');

        // WAIT for background credit to finish (from the first call)
        await tracker.awaitAll();

        const account = await accountService.getAccount(1);
        expect(account.balance).toBe(1000);
    }, 30000);

    it('handles gateway failure by marking transaction as FAILED', async () => {
        const accountService = new AccountService(accRepo);
        const tracker = trackBackgroundWork(accountService);

        const gateway = new CyberSourceSimulator(10, 'ALWAYS_FAIL');
        const txService = new TransactionService(txRepo, gateway, accountService);

        const tx = await txService.authorizeTransaction(1, 1000);

        // Settlement will fail due to gateway
        await txService.settleTransaction(tx.id);

        const updated = await txService.getTransaction(tx.id);
        expect(updated.status).toBe('FAILED');

        await tracker.awaitAll(); // Just in case, though none should be spawned

        // Balance NOT credited
        expect((await accountService.getAccount(1)).balance).toBe(0);
    }, 30000);

    it('throws 404 for non-existent transaction', async () => {
        const accountService = new AccountService(accRepo);
        const gateway = new CyberSourceSimulator(10, 'ALWAYS_OK');
        const txService = new TransactionService(txRepo, gateway, accountService);

        await expect(txService.settleTransaction(999)).rejects.toThrow('Transaction not found');
    }, 30000);

    it('throws 409 if transaction has no authId', async () => {
        const accountService = new AccountService(accRepo);
        const gateway = new CyberSourceSimulator(10, 'ALWAYS_OK');
        const txService = new TransactionService(txRepo, gateway, accountService);

        const tx = await txRepo.save({
            accountId: 1,
            amount: 100,
            status: 'AUTHORIZED', // but NO authId
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        await expect(txService.settleTransaction(tx.id)).rejects.toThrow('Missing auth reference');
    }, 30000);

    it('is idempotent for FAILED transactions', async () => {
        const accountService = new AccountService(accRepo);
        const gateway = new CyberSourceSimulator(10, 'ALWAYS_OK');
        const txService = new TransactionService(txRepo, gateway, accountService);

        const tx = await txRepo.save({
            accountId: 1,
            amount: 100,
            status: 'FAILED',
            authId: 'auth_123',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // Settle should do nothing
        await txService.settleTransaction(tx.id);

        const check = await txService.getTransaction(tx.id);
        expect(check.status).toBe('FAILED');
    }, 30000);

    it('persists data correctly in database', async () => {
        const accountService = new AccountService(accRepo);
        const tracker = trackBackgroundWork(accountService);

        const gateway = new CyberSourceSimulator(10, 'ALWAYS_OK');
        const txService = new TransactionService(txRepo, gateway, accountService);

        const tx = await txService.authorizeTransaction(1, 500);
        await txService.settleTransaction(tx.id);

        // Verify data persisted in database directly
        const dbTx = await prisma.transaction.findUnique({ where: { id: tx.id } });
        expect(dbTx?.status).toBe('SETTLED');
        expect(dbTx?.settlementId).toBeTruthy();

        // WAIT for background credit to finish
        await tracker.awaitAll();
    }, 30000);
});
