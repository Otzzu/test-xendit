import { Account } from './account.entity';
import { AccountRepository } from './account.repository';

export class AccountService {
    constructor(private readonly repo: AccountRepository) { }

    async credit(accountId: number, amount: number): Promise<Account> {
        return this.repo.credit(accountId, amount);
    }

    async getAccount(accountId: number): Promise<Account> {
        return await this.repo.getOrCreate(accountId);
    }
}
