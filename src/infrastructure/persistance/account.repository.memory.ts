import { Account } from '../../modules/account/account.entity';
import { AccountRepository } from '../../modules/account/account.repository';

import { db } from './memory-db';

export class InMemoryAccountRepository implements AccountRepository {
    getOrCreate(accountId: number): Account {
        const existing = db.accounts.get(accountId);
        if (existing) return existing;

        const now = new Date().toISOString();
        const created: Account = { id: accountId, balance: 0, updatedAt: now };
        db.accounts.set(accountId, created);
        return created;
    }

    get(accountId: number): Account | undefined {
        return db.accounts.get(accountId);
    }

    credit(accountId: number, amount: number): Account {
        const acc = this.getOrCreate(accountId);
        const now = new Date().toISOString();

        const updated: Account = {
            ...acc,
            balance: acc.balance + amount,
            updatedAt: now,
        };

        db.accounts.set(accountId, updated);
        return updated;
    }
}
