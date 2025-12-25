import { InMemoryAccountRepository } from '../../infrastructure/persistance/memory/account.repository.memory';
import { db } from '../../infrastructure/persistance/memory/memory-db';
import { AccountService } from '../../modules/account/account.service';
import { flushMicrotasks } from '../test-utils';

describe('AccountService (service-level)', () => {
    beforeEach(() => {
        db.clear();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('credits balance asynchronously via creditAfterSettlement', async () => {
        const repo = new InMemoryAccountRepository();
        const svc = new AccountService(repo);

        expect((await svc.getAccount(1)).balance).toBe(0);

        const p = svc.creditAfterSettlement(1, 2500);

        // not credited yet (still pending)
        expect((await svc.getAccount(1)).balance).toBe(0);

        // advance assumed ledger delay 5000ms
        jest.advanceTimersByTime(5000);
        await flushMicrotasks();
        await p;

        expect((await svc.getAccount(1)).balance).toBe(2500);
    });
});
