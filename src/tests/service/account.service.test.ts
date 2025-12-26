import { InMemoryAccountRepository } from '../../infrastructure/persistance/memory/account.repository.memory';
import { db } from '../../infrastructure/persistance/memory/memory-db';
import { AccountService } from '../../modules/account/account.service';

describe('AccountService (service-level)', () => {
    beforeEach(() => {
        db.clear();
    });

    it('credits balance via credit()', async () => {
        const repo = new InMemoryAccountRepository();
        const svc = new AccountService(repo);

        expect((await svc.getAccount(1)).balance).toBe(0);

        await svc.credit(1, 2500);

        expect((await svc.getAccount(1)).balance).toBe(2500);
    });

    it('creates account if not exists via getAccount()', async () => {
        const repo = new InMemoryAccountRepository();
        const svc = new AccountService(repo);

        const account = await svc.getAccount(99);

        expect(account.id).toBe(99);
        expect(account.balance).toBe(0);
    });
});
