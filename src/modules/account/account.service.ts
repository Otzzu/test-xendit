import { Account } from './account.entity';
import { AccountRepository } from './account.repository';

export class AccountService {
    constructor(private readonly repo: AccountRepository) { }


    async creditAfterSettlement(accountId: number, amount: number): Promise<Account> {
        // Simulated async delay
        await new Promise((r) => setTimeout(r, 5000));
        return this.repo.credit(accountId, amount);
    }

    getAccount(accountId: number): Account {
        return this.repo.getOrCreate(accountId);
    }
}
